import type { GuFunctionProps } from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
import { ComparisonOperator, MathExpression } from 'aws-cdk-lib/aws-cloudwatch';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine } from 'aws-cdk-lib/aws-events-targets';
import {
	ManagedPolicy,
	PolicyStatement,
	Role,
	ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Topic } from 'aws-cdk-lib/aws-sns';
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
import { LambdaInvoke, SnsPublish } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import {
	APP,
	bucketName,
} from '../../handlers/scrub-non-tokenised-payment-methods/src/constants';
import { AllowZuoraOAuthSecretsPolicy } from './cdk/policies';
import { SrLambda } from './cdk/SrLambda';
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

		/*
		 * This lambda is given an explicit role only so its name stays short
		 * enough for the GCP auth request, which sends the role name. Passing a
		 * role means CDK does not build one, so the basic execution policy it
		 * would have attached is added here instead.
		 *
		 * The name below is half of a contract with GCP: it is referenced from
		 * the workload identity setup in the gcp-iac-terraform repo, owned by
		 * Data Technology. Renaming it breaks BigQuery access until that side is
		 * updated to match. See docs/bigquery-access.md.
		 */
		const lambdaRole = new Role(this, 'LambdaRole', {
			roleName: `scrub-non-tok-pm-${this.stage}`,
			assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
			managedPolicies: [
				ManagedPolicy.fromAwsManagedPolicyName(
					'service-role/AWSLambdaBasicExecutionRole',
				),
			],
		});

		lambdaRole.addToPolicy(
			new PolicyStatement({
				actions: ['s3:GetObject', 's3:PutObject'],
				resources: [bucket.arnForObjects('*')],
			}),
		);

		const lambdaDefaults: Partial<GuFunctionProps> = {
			architecture: Architecture.ARM_64,
			timeout: Duration.minutes(3),
		};

		const getPaymentMethodsToScrubLambda = new SrLambda(
			this,
			'GetPaymentMethodsToScrubLambda',
			{
				nameSuffix: 'get',
				lambdaOverrides: {
					...lambdaDefaults,
					handler: 'getPaymentMethodsToScrub.handler',
					role: lambdaRole,
				},
			},
		);

		const getPaymentMethodsToScrub = new LambdaInvoke(
			this,
			'GetNonTokenisedPaymentMethodsOnCancelledAccounts',
			{
				lambdaFunction: getPaymentMethodsToScrubLambda,
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
				},
			},
		);

		scrubPaymentMethodsLambda.addPolicies(
			new AllowZuoraOAuthSecretsPolicy(this),
		);

		const processPaymentMethods = new DistributedMap(
			this,
			'ProcessPaymentMethodsInDistributedMap',
			{
				comment: `MaxConcurrency is 1 to stay inside Zuora's limit on requests in flight. ToleratedFailurePercentage is 100 so one bad account does not stop the rest of the run`,
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
			{
				mode: ProcessorMode.DISTRIBUTED,
				executionType: ProcessorType.STANDARD,
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

		const notifyTeam = new SnsPublish(
			this,
			'NotifyTeamSomePaymentMethodsFailed',
			{
				topic: Topic.fromTopicArn(this, 'AlarmsHandlerTopic', snsTopicArn),
				message: TaskInput.fromText(
					JsonPath.format(
						`{} - Some non-tokenised payment methods on fully cancelled accounts failed to be scrubbed.\nYou can review the failures here:\nhttps://s3.console.aws.amazon.com/s3/object/{}?region={}&prefix={}`,
						this.stage,
						bucket.bucketName,
						this.region,
						JsonPath.stringAt('$.ResultFiles.FAILED[0].Key'),
					),
				),
				messageAttributes: {
					app: { value: APP },
					stage: { value: this.stage },
				},
				resultPath: '$.TaskResult',
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

		/*
		 * Kept short so the log link the alarms handler builds covers a narrow
		 * window, which makes the offending execution easy to find.
		 */
		const alarmPeriod = Duration.minutes(1);

		new SrLambdaAlarm(
			this,
			'ScrubNonTokenisedPaymentMethodsStepFunctionFailureAlarm',
			{
				app: APP,
				/*
				 * A run that hits the state machine timeout ends as TimedOut, not
				 * Failed, so alarming on failures alone would miss the case the
				 * timeout is there to catch.
				 */
				metric: new MathExpression({
					expression: 'failed + timedOut',
					usingMetrics: {
						failed: stateMachine.metricFailed({ statistic: 'Sum' }),
						timedOut: stateMachine.metricTimedOut({ statistic: 'Sum' }),
					},
					period: alarmPeriod,
				}),
				threshold: 1,
				evaluationPeriods: 1,
				alarmDescription:
					'The scheduled job that scrubs non-tokenised payment methods on fully cancelled accounts has failed or timed out. Login to the AWS console and debug the last execution.',
				alarmName: `${this.stage}: ScrubNonTokenisedPaymentMethodsStepFunctionExecutionFailure`,
				comparisonOperator:
					ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				lambdaFunctionNames: [
					getPaymentMethodsToScrubLambda.functionName,
					scrubPaymentMethodsLambda.functionName,
				],
			},
		);
	}
}
