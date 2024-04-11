import { GuScheduledLambda } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine } from 'aws-cdk-lib/aws-events-targets';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import {
	CustomState,
	DefinitionBody,
	// Pass,
	StateMachine,
} from 'aws-cdk-lib/aws-stepfunctions';

export class SalesforceDisasterRecoveryHealthCheck extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'salesforce-disaster-recovery-health-check';

		const snsTopicArn = `arn:aws:sns:${this.region}:${this.account}:salesforce-disaster-recovery-${this.stage}`;

		const stateMachine = StateMachine.fromStateMachineName(
			this,
			'stateMachine',
			`salesforce-disaster-recovery-${this.stage}`,
		);

		new GuScheduledLambda(this, 'salesforce-disaster-recovery-health-check', {
			app,
			memorySize: 1024,
			fileName: `${app}.zip`,
			runtime: Runtime.NODEJS_20_X,
			timeout: Duration.minutes(5),
			environment: {
				APP: app,
				STACK: this.stack,
				STAGE: this.stage,
				SNS_TOPIC_ARN: snsTopicArn,
				STATE_MACHINE_ARN: stateMachine.stateMachineArn,
			},
			handler: 'salesforceDisasterRecoveryHealthCheck.handler',
			functionName: `${app}-${this.stage}`,
			rules: [
				{
					schedule: Schedule.cron({
						minute: '0',
						hour: '6',
						weekDay: 'MON',
						month: '*',
						year: '*',
					}),
				},
			],
			monitoringConfiguration: { noMonitoring: true },
			initialPolicy: [
				new PolicyStatement({
					actions: ['states:StartExecution'],
					resources: [
						`arn:aws:states:${this.region}:${this.account}:stateMachine:salesforce-disaster-recovery-${this.stage}`,
					],
				}),
				new PolicyStatement({
					actions: ['states:DescribeExecution'],
					resources: [
						`arn:aws:states:${this.region}:${this.account}:execution:salesforce-disaster-recovery-${this.stage}:*`,
					],
				}),
				new PolicyStatement({
					actions: ['sns:Publish'],
					resources: [snsTopicArn],
				}),
			],
		});

		const startExecution = new CustomState(this, 'StartExecution', {
			stateJson: {
				Type: 'Task',
				Resource: 'arn:aws:states:::states:startExecution.sync:2',
				Parameters: {
					StateMachineArn: stateMachine.stateMachineArn,
					Input: {
						query:
							"SELECT Id, Zuora__Zuora_Id__c, Zuora__Account__c, Contact__c FROM Zuora__CustomerAccount__c WHERE CreatedDate = YESTERDAY AND Zuora__Status__c = 'Active'",
					},
					Name: `health-check-${new Date()
						.toISOString()
						.replace(/[:\-.]/g, '')}`,
				},
			},
		});

		const testStateMachine = new StateMachine(
			this,
			'SalesforceDisasterRecoveryHealthCheckStateMachine',
			{
				stateMachineName: `${app}-${this.stage}`,
				definitionBody: DefinitionBody.fromChainable(startExecution),
			},
		);

		testStateMachine.role.attachInlinePolicy(
			new Policy(
				this,
				'SalesforceDisasterRecoveryHealthCheckStateMachineRoleAdditionalPolicy',
				{
					statements: [
						new PolicyStatement({
							actions: ['states:StartExecution'],
							resources: [stateMachine.stateMachineArn],
						}),
						new PolicyStatement({
							actions: ['sns:Publish'],
							resources: [snsTopicArn],
						}),
					],
				},
			),
		);

		new Rule(this, 'Rule', {
			schedule: Schedule.cron({
				minute: '0',
				hour: '6',
				weekDay: 'MON',
				month: '*',
				year: '*',
			}),
			targets: [new SfnStateMachine(testStateMachine)],
		});
	}
}
