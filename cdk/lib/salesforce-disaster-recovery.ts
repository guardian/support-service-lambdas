import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { type App } from 'aws-cdk-lib';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
	CustomState,
	DefinitionBody,
	StateMachine,
	Wait,
	WaitTime,
} from 'aws-cdk-lib/aws-stepfunctions';

interface Props extends GuStackProps {
	salesforceApiDomain: string;
	salesforceApiConnectionResourceId: string;
	salesforceBulkQueryWaitSeconds: number;
}

export class SalesforceDisasterRecovery extends GuStack {
	constructor(scope: App, id: string, props: Props) {
		super(scope, id, props);

		const salesforceApiConnectionArn = `arn:aws:events:${this.region}:${this.account}:connection/${props.salesforceApiConnectionResourceId}`;

		const app = 'salesforce-disaster-recovery';

		const createSalesforceQueryJob = new CustomState(
			this,
			'CreateSalesforceQueryJob',
			{
				stateJson: {
					Type: 'Task',
					Resource: 'arn:aws:states:::http:invoke',
					Parameters: {
						ApiEndpoint: `${props.salesforceApiDomain}/services/data/v59.0/jobs/query`,
						Method: 'POST',
						Authentication: {
							ConnectionArn: salesforceApiConnectionArn,
						},
						RequestBody: {
							operation: 'query',
							'query.$': '$.query',
						},
					},
					Retry: [
						{
							ErrorEquals: ['States.Http.StatusCode.400'],
							MaxAttempts: 0,
						},
						{
							ErrorEquals: ['States.ALL'],
							IntervalSeconds: 5,
							MaxAttempts: 3,
							BackoffRate: 2,
						},
					],
				},
			},
		);

		const waitForSalesforceQueryJobToComplete = new Wait(
			this,
			'WaitForSalesforceQueryJobToComplete',
			{
				time: WaitTime.duration(
					Duration.seconds(props.salesforceBulkQueryWaitSeconds),
				),
			},
		);

		const stateMachine = new StateMachine(
			this,
			'SalesforceDisasterRecoveryStateMachine',
			{
				stateMachineName: `${app}-${this.stage}`,
				definitionBody: DefinitionBody.fromChainable(
					createSalesforceQueryJob.next(waitForSalesforceQueryJobToComplete),
				),
			},
		);

		stateMachine.role.attachInlinePolicy(
			new Policy(this, 'SalesforceApiHttpInvoke', {
				statements: [
					new PolicyStatement({
						actions: ['states:InvokeHTTPEndpoint'],
						resources: [stateMachine.stateMachineArn],
						conditions: {
							StringEquals: {
								'states:HTTPMethod': 'POST',
							},
							StringLike: {
								'states:HTTPEndpoint': `${props.salesforceApiDomain}/*`,
							},
						},
					}),
					new PolicyStatement({
						actions: ['events:RetrieveConnectionCredentials'],
						resources: [salesforceApiConnectionArn],
					}),
					new PolicyStatement({
						actions: [
							'secretsmanager:GetSecretValue',
							'secretsmanager:DescribeSecret',
						],
						resources: [
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:events!connection/${app}-${this.stage}-salesforce-api/*`,
						],
					}),
				],
			}),
		);
	}
}
