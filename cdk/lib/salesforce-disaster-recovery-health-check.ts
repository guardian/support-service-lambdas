import { GuScheduledLambda } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Schedule } from 'aws-cdk-lib/aws-events';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';

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
				REGION: this.region,
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
	}
}
