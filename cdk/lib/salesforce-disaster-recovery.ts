import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import {
	CustomState,
	DefinitionBody,
	StateMachine,
} from 'aws-cdk-lib/aws-stepfunctions';

interface Props extends GuStackProps {
	salesforceApiDomain: string;
	salesforceApiConnectionResourceId: string;
}

export class SalesforceDisasterRecovery extends GuStack {
	constructor(scope: App, id: string, props: Props) {
		super(scope, id, props);

		const { salesforceApiDomain, salesforceApiConnectionResourceId } = props;
		const salesforceApiConnectionArn = `arn:aws:events:${this.region}:${this.account}:connection/${salesforceApiConnectionResourceId}`;

		const app = 'salesforce-disaster-recovery';
		const runtime = Runtime.NODEJS_20_X;
		const fileName = `${app}.zip`;
		const timeout = Duration.seconds(300);
		const memorySize = 1024;
		const environment = {
			APP: app,
			STACK: this.stack,
			STAGE: this.stage,
		};

		const lambdaCommonConfig = {
			app,
			runtime,
			fileName,
			timeout,
			memorySize,
			environment,
		};

		new GuLambdaFunction(this, 'PlaceholderLambda', {
			handler: 'placeholderLambda.handler',
			functionName: `placeholder-lambda-${this.stage}`,
			...lambdaCommonConfig,
		});

		const createSalesforceQueryJob = new CustomState(
			this,
			'CreateSalesforceQueryJob',
			{
				stateJson: {
					Type: 'Task',
					Resource: 'arn:aws:states:::http:invoke',
					Parameters: {
						ApiEndpoint: `${salesforceApiDomain}/services/data/v59.0/jobs/query`,
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

		const stateMachine = new StateMachine(
			this,
			'SalesforceDisasterRecoveryStateMachine',
			{
				stateMachineName: `${app}-${this.stage}`,
				definitionBody: DefinitionBody.fromChainable(createSalesforceQueryJob),
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
								'states:HTTPEndpoint': `${salesforceApiDomain}/*`,
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
