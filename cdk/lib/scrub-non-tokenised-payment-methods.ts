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
	DistributedMap,
	ItemBatcher,
	JsonPath,
	ProcessorMode,
	ProcessorType,
	ResultWriter,
	S3JsonItemReader,
	StateMachine,
	Succeed,
	TaskInput,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import {
	APP,
	bucketName,
	gcpCredentialsConfigParameterName,
} from '../../handlers/scrub-non-tokenised-payment-methods/src/constants';
import { getNameWithStage, SrLambda } from './cdk/SrLambda';
import { SrLambdaAlarm } from './cdk/SrLambdaAlarm';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class ScrubNonTokenisedPaymentMethods extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: APP });

		const bucket = new Bucket(this, 'Bucket', {
			bucketName: bucketName(stage),
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
					`arn:aws:ssm:${this.region}:${this.account}:parameter${gcpCredentialsConfigParameterName(stage)}`,
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

		const processPaymentMethods = new DistributedMap(
			this,
			'ProcessPaymentMethodsInDistributedMap',
			{
				comment: `MaxConcurrency is 1 to stay well inside Zuora's rate limit. ToleratedFailurePercentage is 100 so one bad account does not stop the rest of the run`,
				maxConcurrency: 1,
				toleratedFailurePercentage: 100,
				itemReader: new S3JsonItemReader({
					bucket,
					key: JsonPath.format(
						`executions/{}/${paymentMethodsFileName}`,
						JsonPath.stringAt('$$.Execution.StartTime'),
					),
				}),
				itemBatcher: new ItemBatcher({ maxItemsPerBatch: 1 }),
				resultWriter: new ResultWriter({
					bucket,
					prefix: JsonPath.format(
						`executions/{}`,
						JsonPath.stringAt('$$.Execution.StartTime'),
					),
				}),
			},
		).itemProcessor(
			new LambdaInvoke(this, 'ScrubPaymentMethods', {
				lambdaFunction: scrubPaymentMethodsLambda,
				outputPath: '$.Payload',
			}),
			{ mode: ProcessorMode.DISTRIBUTED, executionType: ProcessorType.STANDARD },
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
								StringValue: APP,
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
				stateMachineName: `${APP}-${this.stage}`,
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

		/*
		 * The distributed map grants itself the bucket, lambda and execution
		 * permissions it needs. Publishing the failure notification is the one
		 * thing it does not know about.
		 */
		stateMachine.role.attachInlinePolicy(
			new Policy(
				this,
				'ScrubNonTokenisedPaymentMethodsStateMachineRoleAdditionalPolicy',
				{
					statements: [
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
				app: APP,
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
