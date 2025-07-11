import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import {
	type GuFunctionProps,
	GuLambdaFunction,
} from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import {
	Choice,
	Condition,
	CustomState,
	DefinitionBody,
	JsonPath,
	Pass,
	StateMachine,
	TaskInput,
	Wait,
	WaitTime,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { nodeVersion } from './node-version';

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
		const failedRowsFileName = 'failed-rows.csv';

		const snsTopicArn = `arn:aws:sns:${this.region}:${this.account}:alarms-handler-topic-${this.stage}`;

		const lambdaDefaultConfig: Pick<
			GuFunctionProps,
			'app' | 'memorySize' | 'fileName' | 'runtime' | 'timeout' | 'environment'
		> = {
			app,
			memorySize: 1024,
			fileName: `${app}.zip`,
			runtime: nodeVersion,
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
						loggingFormat: LoggingFormat.TEXT,
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
				loggingFormat: LoggingFormat.TEXT,
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
					MaxConcurrency: 20,
					ToleratedFailurePercentage: 100,
					Comment: `ToleratedFailurePercentage is set to 100% because we want the distributed map state to complete processing all batches`,
					ItemReader: {
						Resource: 'arn:aws:states:::s3:getObject',
						ReaderConfig: {
							InputType: 'CSV',
							CSVHeaderLocation: 'FIRST_ROW',
						},
						Parameters: {
							Bucket: bucket.bucketName,
							'Key.$': JsonPath.format(
								`{}/${queryResultFileName}`,
								JsonPath.stringAt('$$.Execution.StartTime'),
							),
						},
					},
					ItemBatcher: {
						MaxItemsPerBatch: 50,
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
									{
										ErrorEquals: ['ZuoraError'],
										IntervalSeconds: 10,
										MaxAttempts: 5,
										BackoffRate: 5,
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

		const getMapResult = new CustomState(this, 'GetMapResult', {
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

		const saveFailedRowsToS3 = new LambdaInvoke(this, 'SaveFailedRowsToS3', {
			lambdaFunction: new GuLambdaFunction(this, 'SaveFailedRowsToS3Lambda', {
				...lambdaDefaultConfig,
				memorySize: 10240,
				handler: 'saveFailedRowsToS3.handler',
				functionName: `save-failed-rows-to-s3-${this.stage}`,
				loggingFormat: LoggingFormat.TEXT,
				environment: {
					...lambdaDefaultConfig.environment,
					S3_BUCKET: bucket.bucketName,
				},
				initialPolicy: [
					new PolicyStatement({
						actions: ['s3:GetObject', 's3:PutObject'],
						resources: [bucket.arnForObjects('*')],
					}),
				],
			}),
			payload: TaskInput.fromObject({
				'resultFiles.$': '$.ResultFiles.FAILED',
				filePath: JsonPath.format(
					`{}/${failedRowsFileName}`,
					JsonPath.stringAt('$$.Execution.StartTime'),
				),
			}),
			resultSelector: {
				failedRowsCount: JsonPath.numberAt('$.Payload.failedRowsCount'),
			},
		});

		const constructNotificationData = new Pass(
			this,
			'ConstructNotificationData',
			{
				parameters: {
					stateMachineExecutionDetailsUrl: JsonPath.format(
						`https://{}.console.aws.amazon.com/states/home?region={}#/executions/details/{}`,
						this.region,
						this.region,
						JsonPath.stringAt('$$.Execution.Id'),
					),
					queryResultFileUrl: JsonPath.format(
						`https://s3.console.aws.amazon.com/s3/object/{}?region={}&prefix={}/{}`,
						bucket.bucketName,
						this.region,
						JsonPath.stringAt('$$.Execution.StartTime'),
						queryResultFileName,
					),
					failedRowsCount: JsonPath.numberAt('$.failedRowsCount'),
					failedRowsFileUrl: JsonPath.format(
						`https://s3.console.aws.amazon.com/s3/object/{}?region={}&prefix={}/{}`,
						bucket.bucketName,
						this.region,
						JsonPath.stringAt('$$.Execution.StartTime'),
						failedRowsFileName,
					),
				},
			},
		);

		const sendCompletionNotification = new CustomState(
			this,
			'SendCompletionNotification',
			{
				stateJson: {
					Type: 'Task',
					Resource: 'arn:aws:states:::sns:publish',
					Parameters: {
						TopicArn: snsTopicArn,
						'Message.$': JsonPath.format(
							`Salesforce Disaster Recovery Re-syncing Procedure Completed For ${this.stage}\n\nThis notification is part of the Salesforce Disaster Recovery procedure explained in the runbook below:\n{}\n\nState machine execution details:\n{}\n\nAccounts to sync:\n{}\n\nAccounts that failed to update ({}):\n{}
						`,
							'https://docs.google.com/document/d/1_KxFtfKU3-3-PSzaAYG90uONa05AVgoBmyBDyu5SC5c/edit#heading=h.2r6eh2y6rjut',
							JsonPath.stringAt('$.stateMachineExecutionDetailsUrl'),
							JsonPath.stringAt('$.queryResultFileUrl'),
							JsonPath.stringAt('$.failedRowsCount'),
							JsonPath.stringAt('$.failedRowsFileUrl'),
						),
						MessageAttributes: {
							app: {
								DataType: 'String',
								StringValue: app,
							},
							stage: {
								DataType: 'String',
								StringValue: this.stage,
							},
						},
					},
					ResultPath: JsonPath.stringAt('$.TaskResult'),
				},
			},
		);

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
									new Choice(this, 'AreThereAccountsToResync')
										.when(
											Condition.numberEquals(
												'$.ResponseBody.numberRecordsProcessed',
												0,
											),
											new Pass(this, 'NoAccountsToResync'),
										)
										.otherwise(
											saveSalesforceQueryResultToS3.next(
												processCsvInDistributedMap
													.next(getMapResult)
													.next(saveFailedRowsToS3)
													.next(
														new Choice(this, 'IsHealthCheck')
															.when(
																Condition.stringMatches(
																	'$$.Execution.Name',
																	'health-check-*',
																),
																new Pass(this, 'HealthCheckSuccessful'),
															)
															.otherwise(
																constructNotificationData
																	.next(sendCompletionNotification)
																	.next(
																		new Choice(
																			this,
																			'HaveAllAccountsBeenResynced',
																		)
																			.when(
																				Condition.numberEquals(
																					'$.failedRowsCount',
																					0,
																				),
																				new Pass(
																					this,
																					'AllAccountsHaveBeenResynced',
																				),
																			)
																			.otherwise(
																				new Pass(
																					this,
																					'SomeAccountsHaveFailedToUpdate',
																					{
																						stateName:
																							"SomeAccountsHaveFailedToUpdate - Open state input 'failedRowsFileUrl' to debug",
																					},
																				),
																			),
																	),
															),
													),
											),
										),
								)
								.otherwise(waitForSalesforceQueryJobToComplete),
						),
				),
			},
		);

		stateMachine.role.attachInlinePolicy(
			new Policy(
				this,
				'SalesforceDisasterRecoveryStateMachineRoleAdditionalPolicy',
				{
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
							actions: [
								'states:RedriveExecution',
								'states:DescribeExecution',
								'states:StopExecution',
							],
							resources: [
								`arn:aws:states:${this.region}:${this.account}:execution:${stateMachine.stateMachineName}/*`,
							],
						}),
						new PolicyStatement({
							actions: ['lambda:InvokeFunction'],
							resources: [updateZuoraAccountsLambda.functionArn],
						}),
						new PolicyStatement({
							actions: ['sns:Publish'],
							resources: [snsTopicArn],
						}),
					],
				},
			),
		);
	}
}
