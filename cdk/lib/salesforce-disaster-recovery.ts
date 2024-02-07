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

export class SalesforceDisasterRecovery extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

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

		// Created from the AWS console: https://eu-west-1.console.aws.amazon.com/events/home?region=eu-west-1#/apidestinations
		const salesforceApiConnectionArn =
			this.stage === 'PROD'
				? `arn:aws:events:${this.region}:${this.account}:connection/${app}-PROD-salesforce-api/d2c146d4-8a46-4803-9ba4-e7671f32cfbb`
				: `arn:aws:events:${this.region}:${this.account}:connection/${app}-CODE-salesforce-api/5ffa1b46-6757-4c6d-aea6-9ebc9aef983c`;

		const salesforceApiDomain =
			this.stage === 'PROD'
				? 'https://gnmtouchpoint.my.salesforce.com'
				: 'https://gnmtouchpoint--dev1.sandbox.my.salesforce.com';

		const createSalesforceQueryJob = new CustomState(
			this,
			'CreateSalesforceQueryJob',
			{
				stateJson: {
					Type: 'Task',
					Resource: 'arn:aws:states:::http:invoke',
					Parameters: {
						ApiEndpoint: `${salesforceApiDomain}/services/data/v60.0/jobs/query`,
						Method: 'POST',
						Authentication: {
							ConnectionArn: salesforceApiConnectionArn,
						},
						RequestBody: {
							operation: 'query',
							'query.$': '$.query',
						},
					},
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
			new Policy(this, 'HttpInvoke', {
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
