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

		const bucket = new Bucket(this, 'Bucket', {
			bucketName: `${app}-${this.stage.toLowerCase()}`,
		});

		const queryResultFileName = 'query-result.csv';

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
					filePath: JsonPath.format(
						`{}/${queryResultFileName}`,
						JsonPath.stringAt('$$.Execution.StartTime'),
					),
				}),
			},
		);

		const updateZuoraAccountsLambda = new GuLambdaFunction(
			this,
			'UpdateZuoraAccountsLambda',
			{
				...lambdaDefaultConfig,
				timeout: Duration.minutes(15),
				memorySize: 10240,
				handler: 'updateZuoraAccounts.handler',
				functionName: `update-zuora-accounts-${this.stage}`,
				initialPolicy: [
					new PolicyStatement({
						actions: ['secretsmanager:GetSecretValue'],
						resources: [
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${this.stage}/Zuora-OAuth/SupportServiceLambdas-*`,
						],
					}),
				],
			},
		);

		const processCsvInDistributedMap = new CustomState(
			this,
			'ProcessCsvInDistributedMap',
			{
				stateJson: {
					Type: 'Map',
					MaxConcurrency: 1,
					ItemReader: {
						Resource: 'arn:aws:states:::s3:getObject',
						ReaderConfig: {
							InputType: 'CSV',
							CSVHeaderLocation: 'FIRST_ROW',
						},
						Parameters: {
							Bucket: bucket.bucketName,
							// Key: 'test-2-million-rows.csv',
							Key: 'two-rows.csv',
							// 'Key.$': JsonPath.format(
							// 	`{}/${queryResultFileName}`,
							// 	JsonPath.stringAt('$$.Execution.StartTime'),
							// ),
						},
					},
					ItemBatcher: {
						MaxItemsPerBatch: 2500,
					},
					ItemProcessor: {
						ProcessorConfig: {
							Mode: 'DISTRIBUTED',
							ExecutionType: 'STANDARD',
						},
						StartAt: 'UpdateZuoraAccounts',
						States: {
							UpdateZuoraAccounts: {
								Type: 'Task',
								Resource: 'arn:aws:states:::lambda:invoke',
								OutputPath: '$.Payload',
								Parameters: {
									'Payload.$': '$',
									FunctionName: updateZuoraAccountsLambda.functionArn,
								},
								Retry: [
									{
										ErrorEquals: [
											'Lambda.ServiceException',
											'Lambda.AWSLambdaException',
											'Lambda.SdkClientException',
											'Lambda.TooManyRequestsException',
										],
										IntervalSeconds: 2,
										MaxAttempts: 6,
										BackoffRate: 2,
									},
								],
								End: true,
							},
						},
					},
					ResultWriter: {
						Resource: 'arn:aws:states:::s3:putObject',
						Parameters: {
							Bucket: bucket.bucketName,
							'Prefix.$': JsonPath.stringAt('$$.Execution.StartTime'),
						},
					},
				},
			},
		);

		// "GetBucketVersioning": {
		//     "Type": "Task",
		//     "End": true,
		//     "Parameters": {
		//       "Bucket.$": "$.Name"
		//     },
		//     "ResultPath": "$.BucketVersioningInfo",
		//     "Resource": "arn:aws:states:::aws-sdk:s3:getBucketVersioning"
		//   },

		const getManifest = new CustomState(this, 'GetManifest', {
			stateJson: {
				Type: 'Task',
				Resource: 'arn:aws:states:::aws-sdk:s3:getObject',
				Parameters: {
					'Bucket.$': JsonPath.stringAt('$.ResultWriterDetails.Bucket'),
					'Key.$': JsonPath.stringAt('$.ResultWriterDetails.Key'),
				},
				ResultSelector: {
					'Payload.$': JsonPath.stringToJson(JsonPath.stringAt('$.Body')),
				},
				OutputPath: '$.Payload',
			},
		});

		// const test2 = new CustomState(this, 'Test2', {
		// 	stateJson: {
		// 		Type: 'Task',
		// 		Resource: 'arn:aws:states:::aws-sdk:s3:getObject',
		// 		Parameters: {
		// 			Bucket: bucket.bucketName,
		// 			Key: '2024-03-04T12:45:30.173Z/912e4a4d-349f-43ce-b350-d3fd59d2c4a7/manifest.json',
		// 		},
		// 		OutputPath: '$.Body',
		// 	},
		// });

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
									saveSalesforceQueryResultToS3.next(
										processCsvInDistributedMap.next(getManifest),
									),
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
					new PolicyStatement({
						actions: ['s3:GetObject', 's3:PutObject'],
						resources: [bucket.arnForObjects('*')],
					}),
					new PolicyStatement({
						actions: ['states:StartExecution'],
						resources: [stateMachine.stateMachineArn],
					}),
					new PolicyStatement({
						actions: ['lambda:InvokeFunction'],
						resources: [updateZuoraAccountsLambda.functionArn],
					}),
				],
			}),
		);
	}
}
