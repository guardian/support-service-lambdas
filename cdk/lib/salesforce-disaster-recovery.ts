import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import {
	type GuFunctionProps,
	GuLambdaFunction,
} from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import {
	Choice,
	Condition,
	CustomState,
	DefinitionBody,
	JsonPath,
	StateMachine,
	TaskInput,
	Wait,
	WaitTime,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';

interface Props extends GuStackProps {
	salesforceApiDomain: string;
	salesforceApiConnectionResourceId: string;
	salesforceQueryWaitSeconds: number;
	salesforceOauthSecretName: string;
}

export class SalesforceDisasterRecovery extends GuStack {
	constructor(scope: App, id: string, props: Props) {
		super(scope, id, props);

		const salesforceApiConnectionArn = `arn:aws:events:${this.region}:${this.account}:connection/${props.salesforceApiConnectionResourceId}`;

		const app = 'salesforce-disaster-recovery';

		const bucket = new Bucket(this, 'Bucket2', {
			bucketName: `${app}-${this.stage.toLowerCase()}-2`,
		});

		const lambdaDefaultConfig: Pick<
			GuFunctionProps,
			'app' | 'memorySize' | 'fileName' | 'runtime' | 'timeout' | 'environment'
		> = {
			app,
			memorySize: 1024,
			fileName: `${app}.zip`,
			runtime: Runtime.NODEJS_20_X,
			timeout: Duration.seconds(300),
			environment: { APP: app, STACK: this.stack, STAGE: this.stage },
		};

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
					Duration.seconds(props.salesforceQueryWaitSeconds),
				),
			},
		);

		const getSalesforceQueryJobStatus = new CustomState(
			this,
			'GetSalesforceQueryJobStatus',
			{
				stateJson: {
					Type: 'Task',
					Resource: 'arn:aws:states:::http:invoke',
					Parameters: {
						'ApiEndpoint.$': JsonPath.format(
							`${props.salesforceApiDomain}/services/data/v59.0/jobs/query/{}`,
							JsonPath.stringAt('$.ResponseBody.id'),
						),
						Method: 'GET',
						Authentication: {
							ConnectionArn: salesforceApiConnectionArn,
						},
					},
				},
			},
		);

		const saveSalesforceQueryResultToS3 = new LambdaInvoke(
			this,
			'SaveSalesforceQueryResultToS3',
			{
				lambdaFunction: new GuLambdaFunction(
					this,
					'SaveSalesforceQueryResultToS3Lambda',
					{
						...lambdaDefaultConfig,
						handler: 'saveSalesforceQueryResultToS3.handler',
						functionName: `save-salesforce-query-result-to-s3-${this.stage}`,
						environment: {
							...lambdaDefaultConfig.environment,
							SALESFORCE_API_DOMAIN: props.salesforceApiDomain,
							SALESFORCE_OAUTH_SECRET_NAME: props.salesforceOauthSecretName,
							S3_BUCKET: bucket.bucketName,
						},
						initialPolicy: [
							new PolicyStatement({
								actions: [
									'secretsmanager:GetSecretValue',
									'secretsmanager:DescribeSecret',
								],
								resources: [
									`arn:aws:secretsmanager:${this.region}:${this.account}:secret:events!connection/${app}-${this.stage}-salesforce-api/*`,
								],
							}),
							new PolicyStatement({
								actions: ['s3:PutObject'],
								resources: [bucket.arnForObjects('*')],
							}),
						],
					},
				),
				payload: TaskInput.fromObject({
					queryJobId: JsonPath.stringAt('$.ResponseBody.id'),
					executionStartTime: JsonPath.stringAt('$$.Execution.StartTime'),
				}),
			},
		);

		const updateZuoraAccounts = new LambdaInvoke(this, 'UpdateZuoraAccounts', {
			lambdaFunction: new GuLambdaFunction(this, 'UpdateZuoraAccountsLambda', {
				...lambdaDefaultConfig,
				timeout: Duration.minutes(15),
				memorySize: 10240,
				handler: 'updateZuoraAccounts.handler',
				functionName: `update-zuora-accounts-${this.stage}`,
				environment: {
					...lambdaDefaultConfig.environment,
					S3_BUCKET: bucket.bucketName,
				},
				initialPolicy: [
					new PolicyStatement({
						actions: [
							'secretsmanager:GetSecretValue',
							// 'secretsmanager:DescribeSecret',
						],
						resources: [
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${this.stage}/Zuora-OAuth/SupportServiceLambdas-*`,
						],
					}),
					new PolicyStatement({
						actions: ['s3:GetObject'],
						resources: [bucket.arnForObjects('*')],
					}),
				],
			}),
			payload: TaskInput.fromObject({
				filePath: JsonPath.stringAt('$.Payload.filePath'),
			}),
		});

		const stateMachine = new StateMachine(
			this,
			'SalesforceDisasterRecoveryStateMachine',
			{
				stateMachineName: `${app}-${this.stage}`,
				definitionBody: DefinitionBody.fromChainable(
					createSalesforceQueryJob
						.next(waitForSalesforceQueryJobToComplete)
						.next(getSalesforceQueryJobStatus)
						.next(
							new Choice(this, 'IsSalesforceQueryJobCompleted')
								.when(
									Condition.stringEquals('$.ResponseBody.state', 'JobComplete'),
									saveSalesforceQueryResultToS3.next(updateZuoraAccounts),
								)
								.otherwise(waitForSalesforceQueryJobToComplete),
						),
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
								'states:HTTPEndpoint': `${props.salesforceApiDomain}/services/data/v59.0/jobs/query`,
							},
						},
					}),
					new PolicyStatement({
						actions: ['states:InvokeHTTPEndpoint'],
						resources: [stateMachine.stateMachineArn],
						conditions: {
							StringEquals: {
								'states:HTTPMethod': 'GET',
							},
							StringLike: {
								'states:HTTPEndpoint': `${props.salesforceApiDomain}/services/data/v59.0/jobs/query/*`,
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
