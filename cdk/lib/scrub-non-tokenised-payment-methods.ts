import type { GuFunctionProps } from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
import { ComparisonOperator } from 'aws-cdk-lib/aws-cloudwatch';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine } from 'aws-cdk-lib/aws-events-targets';
import {
	Policy,
	PolicyStatement,
	Role,
	ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
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
import { getNameWithStage, SrLambda } from './cdk/SrLambda';
import { SrLambdaAlarm } from './cdk/SrLambdaAlarm';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class ScrubNonTokenisedPaymentMethods extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'scrub-non-tokenised-payment-methods' });

		const app = this.app;

		const bucket = new Bucket(this, 'Bucket', {
			bucketName: `${app}-${this.stage.toLowerCase()}`,
		});

		const snsTopicArn = `arn:aws:sns:${this.region}:${this.account}:alarms-handler-topic-${this.stage}`;

		const paymentMethodsFileName = 'payment-methods-to-scrub.json';

		const lambdaRole = new Role(this, 'LambdaRole', {
			roleName: `scrub-non-tok-pm-${this.stage}`, // Role name must be short to not break the authentication request to GCP
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
				actions: ['s3:GetObject', 's3:PutObject'],
				resources: [bucket.arnForObjects('*')],
			}),
		);

		/*
		 * The other lambda gets its logging from the role GuCDK builds for it.
		 * This one is given an explicit role so its name stays short enough for
		 * the GCP auth request, which means the managed basic execution policy is
		 * not attached and logging has to be granted here.
		 */
		lambdaRole.addToPolicy(
			new PolicyStatement({
				actions: [
					'logs:CreateLogGroup',
					'logs:CreateLogStream',
					'logs:PutLogEvents',
				],
				resources: [
					`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${getNameWithStage(this, 'get')}`,
					`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${getNameWithStage(this, 'get')}:*`,
				],
			}),
		);

		const lambdaDefaults: Partial<GuFunctionProps> = {
			architecture: Architecture.ARM_64,
			timeout: Duration.minutes(3),
		};

		const getPaymentMethodsToScrub = new LambdaInvoke(
			this,
			'GetNonTokenisedPaymentMethodsOnCancelledAccounts',
			{
				lambdaFunction: new SrLambda(this, 'GetPaymentMethodsToScrubLambda', {
					nameSuffix: 'get',
					lambdaOverrides: {
						...lambdaDefaults,
						environment: {
							GCP_CREDENTIALS_CONFIG_PARAMETER_NAME: `/${app}/${this.stage}/gcp-credentials-config`,
							GCP_PROJECT_ID: `datatech-platform-${this.stage.toLowerCase()}`,
							BUCKET_NAME: bucket.bucketName,
						},
						handler: 'getPaymentMethodsToScrub.handler',
						role: lambdaRole,
					},
				}),
				payload: TaskInput.fromObject({
					filePath: JsonPath.format(
						`executions/{}/${paymentMethodsFileName}`,
						JsonPath.stringAt('$$.Execution.StartTime'),
					),
				}),
			},
		);

		const scrubPaymentMethodsLambda = new SrLambda(
			this,
			'ScrubPaymentMethodsLambda',
			{
				nameSuffix: 'scrub',
				lambdaOverrides: {
					...lambdaDefaults,
					memorySize: 512,
					handler: 'scrubPaymentMethods.handler',
					environment: {
						// Log what would happen without touching Zuora. Flip to false in a
						// follow-up once a PROD run has been eyeballed.
						DRY_RUN: 'true',
					},
					initialPolicy: [
						new PolicyStatement({
							actions: ['secretsmanager:GetSecretValue'],
							resources: [
								`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${this.stage}/Zuora-OAuth/SupportServiceLambdas-*`,
							],
						}),
					],
				},
			},
		);

		const processPaymentMethods = new CustomState(
			this,
			'ProcessPaymentMethodsInDistributedMap',
			{
				stateJson: {
					Type: 'Map',
					MaxConcurrency: 1,
					ToleratedFailurePercentage: 100,
					Comment: `MaxConcurrency is 1 to stay well inside Zuora's rate limit. ToleratedFailurePercentage is 100 so one bad account does not stop the rest of the run`,
					ItemReader: {
						Resource: 'arn:aws:states:::s3:getObject',
						ReaderConfig: {
							InputType: 'JSON',
						},
						Parameters: {
							Bucket: bucket.bucketName,
							'Key.$': JsonPath.format(
								`executions/{}/${paymentMethodsFileName}`,
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
						StartAt: 'ScrubPaymentMethods',
						States: {
							ScrubPaymentMethods: {
								Type: 'Task',
								Resource: 'arn:aws:states:::lambda:invoke',
								OutputPath: '$.Payload',
								Parameters: {
									'Payload.$': '$',
									FunctionName: scrubPaymentMethodsLambda.functionArn,
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

		const notifyTeam = new CustomState(
			this,
			'NotifyTeamSomePaymentMethodsFailed',
			{
				stateJson: {
					Type: 'Task',
					Resource: 'arn:aws:states:::sns:publish',
					Parameters: {
						TopicArn: snsTopicArn,
						'Message.$': JsonPath.format(
							`{} - Some non-tokenised payment methods on fully cancelled accounts failed to be scrubbed.\nYou can review the failures here:\nhttps://s3.console.aws.amazon.com/s3/object/{}?region={}&prefix={}`,
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
			},
		);

		const checkForFailures = new Choice(this, 'CheckForFailures')
			.when(
				Condition.isNotPresent('$.ResultFiles.FAILED[0]'),
				new Succeed(this, 'AllPaymentMethodsScrubbedSuccessfully'),
			)
			.otherwise(notifyTeam);

		const stateMachine = new StateMachine(
			this,
			'ScrubNonTokenisedPaymentMethodsStateMachine',
			{
				stateMachineName: `${app}-${this.stage}`,
				// 500 items processed one at a time, a few Zuora calls each. An hour
				// is generous; past that something is stuck and we want to know
				// rather than have the execution sit there until tomorrow's run.
				timeout: Duration.hours(1),
				definitionBody: DefinitionBody.fromChainable(
					getPaymentMethodsToScrub
						.next(processPaymentMethods)
						.next(getMapResult)
						.next(checkForFailures),
				),
			},
		);

		stateMachine.role.attachInlinePolicy(
			new Policy(
				this,
				'ScrubNonTokenisedPaymentMethodsStateMachineRoleAdditionalPolicy',
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
							resources: [scrubPaymentMethodsLambda.functionArn],
						}),
						new PolicyStatement({
							actions: ['sns:Publish'],
							resources: [snsTopicArn],
						}),
					],
				},
			),
		);

		const rule = new Rule(this, 'Daily6AMRule', {
			schedule: Schedule.cron({
				minute: '0',
				hour: '6',
				month: '*',
				weekDay: '*',
				year: '*',
			}),
			enabled: this.stage == 'PROD',
		});

		rule.addTarget(new SfnStateMachine(stateMachine));

		new SrLambdaAlarm(
			this,
			'ScrubNonTokenisedPaymentMethodsStepFunctionFailureAlarm',
			{
				app,
				metric: stateMachine.metricFailed({
					period: Duration.minutes(5),
					statistic: 'Sum',
				}),
				threshold: 1,
				evaluationPeriods: 1,
				alarmDescription:
					'The scheduled job that scrubs non-tokenised payment methods on fully cancelled accounts has failed. Login to the AWS console and debug the last execution.',
				alarmName: `${this.stage}: ScrubNonTokenisedPaymentMethodsStepFunctionExecutionFailure`,
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				lambdaFunctionNames: scrubPaymentMethodsLambda.functionName,
			},
		);
	}
}
