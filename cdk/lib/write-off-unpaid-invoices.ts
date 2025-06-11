import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import {
	type GuFunctionProps,
	GuLambdaFunction,
} from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
import { Alarm, ComparisonOperator } from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine } from 'aws-cdk-lib/aws-events-targets';
import {
	Policy,
	PolicyStatement,
	Role,
	ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Topic } from 'aws-cdk-lib/aws-sns';
import {
	Choice,
	Condition,
	CustomState,
	DefinitionBody,
	JsonPath,
	StateMachine,
	Succeed,
	TaskInput,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { nodeVersion } from './node-version';

export class WriteOffUnpaidInvoices extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'write-off-unpaid-invoices';

		const bucket = new Bucket(this, 'Bucket', {
			bucketName: `${app}-${this.stage.toLowerCase()}`,
		});

		const snsTopicArn = `arn:aws:sns:${this.region}:${this.account}:alarms-handler-topic-${this.stage}`;
		const alarmTopic = Topic.fromTopicArn(this, 'AlarmTopic', snsTopicArn);

		const unpaidInvoicesFileName = 'unpaid-invoices.json';

		const lambdaRole = new Role(this, 'LambdaRole', {
			roleName: `wrtoff-unpaid-${this.stage}`, // Role name must be short to not break the authentication request to GCP
			assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
		});

		lambdaRole.addToPolicy(
			new PolicyStatement({
				actions: ['ssm:GetParameter'],
				resources: [
					`arn:aws:ssm:${this.region}:${this.account}:parameter/${app}/${this.stage}/gcp-credentials-config`,
				],
			}),
		);

		lambdaRole.addToPolicy(
			new PolicyStatement({
				actions: [
					's3:GetObject',
					's3:PutObject',
					's3:ListBucket',
					's3:ListMultipartUploadParts',
				],
				resources: [bucket.arnForObjects('*')],
			}),
		);

		lambdaRole.addToPolicy(
			new PolicyStatement({
				actions: [
					'logs:CreateLogGroup',
					'logs:CreateLogStream',
					'logs:PutLogEvents',
				],
				resources: ['*'],
			}),
		);

		const lambdaDefaultConfig: Pick<
			GuFunctionProps,
			'app' | 'memorySize' | 'fileName' | 'runtime' | 'timeout' | 'environment'
		> = {
			app,
			memorySize: 1024,
			fileName: `${app}.zip`,
			runtime: nodeVersion,
			timeout: Duration.minutes(3),
			environment: { Stage: this.stage },
		};

		const getUnpaidInvoices = new LambdaInvoke(
			this,
			'GetUnpaidInvoicesLast5DaysCancellations',
			{
				lambdaFunction: new GuLambdaFunction(this, 'GetUnpaidInvoicesLambda', {
					...lambdaDefaultConfig,
					environment: {
						...lambdaDefaultConfig.environment,
						GCP_CREDENTIALS_CONFIG_PARAMETER_NAME: `/${app}/${this.stage}/gcp-credentials-config`,
						GCP_PROJECT_ID: `datatech-platform-${this.stage.toLowerCase()}`,
						BUCKET_NAME: bucket.bucketName,
					},
					handler: 'getUnpaidInvoices.handler',
					functionName: `get-unpaid-invoices-${this.stage}`,
					role: lambdaRole,
				}),
				payload: TaskInput.fromObject({
					filePath: JsonPath.format(
						`executions/{}/${unpaidInvoicesFileName}`,
						JsonPath.stringAt('$$.Execution.StartTime'),
					),
				}),
			},
		);

		const writeOffInvoicesLambda = new GuLambdaFunction(
			this,
			'WriteOffInvoicesLambda',
			{
				...lambdaDefaultConfig,
				memorySize: 512,
				handler: 'writeOffInvoices.handler',
				functionName: `write-off-invoices-${this.stage}`,
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

		const processInvoices = new CustomState(
			this,
			'ProcessInvoicesInDistributedMap',
			{
				stateJson: {
					Type: 'Map',
					MaxConcurrency: 1,
					ToleratedFailurePercentage: 100,
					Comment: `ToleratedFailurePercentage is set to 100% because we want the distributed map state to complete processing all batches`,
					ItemReader: {
						Resource: 'arn:aws:states:::s3:getObject',
						ReaderConfig: {
							InputType: 'JSON',
						},
						Parameters: {
							Bucket: bucket.bucketName,
							'Key.$': JsonPath.format(
								`executions/{}/${unpaidInvoicesFileName}`,
								JsonPath.stringAt('$$.Execution.StartTime'),
							),
						},
					},
					ItemBatcher: {
						MaxItemsPerBatch: 1,
					},
					ItemProcessor: {
						ProcessorConfig: {
							Mode: 'DISTRIBUTED',
							ExecutionType: 'STANDARD',
						},
						StartAt: 'WriteOffInvoices',
						States: {
							WriteOffInvoices: {
								Type: 'Task',
								Resource: 'arn:aws:states:::lambda:invoke',
								OutputPath: '$.Payload',
								Parameters: {
									'Payload.$': '$',
									FunctionName: writeOffInvoicesLambda.functionArn,
								},
								End: true,
							},
						},
					},
					ResultWriter: {
						Resource: 'arn:aws:states:::s3:putObject',
						Parameters: {
							Bucket: bucket.bucketName,
							'Prefix.$': JsonPath.format(
								`executions/{}`,
								JsonPath.stringAt('$$.Execution.StartTime'),
							),
						},
					},
				},
			},
		);

		const processInvoicesAdHoc = new CustomState(
			this,
			'AdHocProcessInvoicesInDistributedMap',
			{
				stateJson: {
					Type: 'Map',
					MaxConcurrency: 1,
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
							'Key.$': JsonPath.stringAt('$$.Execution.Input.File'),
						},
					},
					ItemBatcher: {
						MaxItemsPerBatch: 1,
					},
					ItemProcessor: {
						ProcessorConfig: {
							Mode: 'DISTRIBUTED',
							ExecutionType: 'STANDARD',
						},
						StartAt: 'WriteOffInvoices',
						States: {
							WriteOffInvoices: {
								Type: 'Task',
								Resource: 'arn:aws:states:::lambda:invoke',
								OutputPath: '$.Payload',
								Parameters: {
									'Payload.$': '$',
									FunctionName: writeOffInvoicesLambda.functionArn,
								},
								End: true,
							},
						},
					},
					ResultWriter: {
						Resource: 'arn:aws:states:::s3:putObject',
						Parameters: {
							Bucket: bucket.bucketName,
							'Prefix.$': JsonPath.format(
								`executions/{}`,
								JsonPath.stringAt('$$.Execution.StartTime'),
							),
						},
					},
				},
			},
		);

		const getMapResult = new CustomState(this, 'GetDistributedMapResult', {
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

		const notifyTeam = new CustomState(this, 'NotifyTeamSomeInvoicesFailed', {
			stateJson: {
				Type: 'Task',
				Resource: 'arn:aws:states:::sns:publish',
				Parameters: {
					TopicArn: snsTopicArn,
					'Message.$': JsonPath.format(
						`{} - Some invoices left over after cancellations failed to be written off.\nYou can review the failed invoices here:\nhttps://s3.console.aws.amazon.com/s3/object/{}?region={}&prefix={}`,
						this.stage,
						bucket.bucketName,
						this.region,
						JsonPath.stringAt('$.ResultFiles.FAILED[0].Key'),
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
		});

		const checkForFailures = new Choice(this, 'CheckForFailures')
			.when(
				Condition.isNotPresent('$.ResultFiles.FAILED[0]'),
				new Succeed(this, 'AllInvoicesWrittenOffSuccessfully'),
			)
			.otherwise(notifyTeam);

		const stateMachine = new StateMachine(
			this,
			'WriteOffUnpaidInvoicesStateMachine',
			{
				stateMachineName: `${app}-${this.stage}`,
				definitionBody: DefinitionBody.fromChainable(
					getUnpaidInvoices
						.next(processInvoices)
						.next(getMapResult)
						.next(checkForFailures),
				),
			},
		);

		const stateMachineAdHoc = new StateMachine(
			this,
			'AdHocWriteOffUnpaidInvoicesStateMachine',
			{
				stateMachineName: `ad-hoc-${app}-${this.stage}`,
				definitionBody: DefinitionBody.fromChainable(processInvoicesAdHoc),
			},
		);

		stateMachine.role.attachInlinePolicy(
			new Policy(
				this,
				'WriteOffUnpaidInvoicesStateMachineRoleAdditionalPolicy',
				{
					statements: [
						new PolicyStatement({
							actions: [
								's3:GetObject',
								's3:PutObject',
								's3:ListBucket',
								's3:ListMultipartUploadParts',
							],
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
							resources: [writeOffInvoicesLambda.functionArn],
						}),
						new PolicyStatement({
							actions: ['sns:Publish'],
							resources: [snsTopicArn],
						}),
					],
				},
			),
		);

		stateMachineAdHoc.role.attachInlinePolicy(
			new Policy(
				this,
				'AdHocWriteOffUnpaidInvoicesStateMachineRoleAdditionalPolicy',
				{
					statements: [
						new PolicyStatement({
							actions: [
								's3:GetObject',
								's3:PutObject',
								's3:ListBucket',
								's3:ListMultipartUploadParts',
							],
							resources: [bucket.arnForObjects('*')],
						}),
						new PolicyStatement({
							actions: ['states:StartExecution'],
							resources: [stateMachineAdHoc.stateMachineArn],
						}),
						new PolicyStatement({
							actions: [
								'states:RedriveExecution',
								'states:DescribeExecution',
								'states:StopExecution',
							],
							resources: [
								`arn:aws:states:${this.region}:${this.account}:execution:${stateMachineAdHoc.stateMachineName}/*`,
							],
						}),
						new PolicyStatement({
							actions: ['lambda:InvokeFunction'],
							resources: [writeOffInvoicesLambda.functionArn],
						}),
						new PolicyStatement({
							actions: ['sns:Publish'],
							resources: [snsTopicArn],
						}),
					],
				},
			),
		);

		const rule = new Rule(this, 'Daily5AMRule', {
			schedule: Schedule.cron({
				minute: '0',
				hour: '5',
				month: '*',
				weekDay: '*',
				year: '*',
			}),
			enabled: this.stage == 'PROD',
		});

		rule.addTarget(new SfnStateMachine(stateMachine));

		const failureAlarm = new Alarm(
			this,
			'WriteOffUnpaidInvoicesStepFunctionFailureAlarm',
			{
				metric: stateMachine.metricFailed({
					period: Duration.minutes(5),
					statistic: 'Sum',
				}),
				threshold: 1,
				evaluationPeriods: 1,
				alarmDescription:
					'The scheduled job that writes off unpaid invoices has failed. Login to the AWS console and debug the last execution.',
				alarmName: `${this.stage}: WriteOffUnpaidInvoicesStepFunctionExecutionFailure`,
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				actionsEnabled: this.stage == 'PROD',
			},
		);

		failureAlarm.addAlarmAction(new SnsAction(alarmTopic));
	}
}
