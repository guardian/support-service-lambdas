import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	ComparisonOperator,
	MathExpression,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine } from 'aws-cdk-lib/aws-events-targets';
import {
	FilterPattern,
	LogGroup,
	MetricFilter,
	RetentionDays,
} from 'aws-cdk-lib/aws-logs';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import {
	Choice,
	Condition,
	CustomState,
	DefinitionBody,
	DistributedMap,
	Fail,
	JsonPath,
	ProcessorMode,
	ProcessorType,
	ResultWriterV2,
	S3JsonItemReader,
	StateMachine,
	StateMachineType,
	Succeed,
	Wait,
	WaitTime,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { AllowZuoraOAuthSecretsPolicy } from './cdk/policies';
import { SrLambda } from './cdk/SrLambda';
import { SrLambdaAlarm } from './cdk/SrLambdaAlarm';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

const errorImpact =
	'a subscriber may not have been sent a legally required reminder or notice email';

export class EmailReminders extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'email-reminders' });

		// opt in on this stack only rather than in cdk.json, as scrub-non-tokenised-payment-methods does
		this.node.setContext(
			'@aws-cdk/aws-stepfunctions:useDistributedMapResultWriterV2',
			true,
		);

		// holds the subscriptions due on each billing date and the map results
		const bucket = new Bucket(this, 'Bucket', {
			blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
			enforceSSL: true,
			lifecycleRules: [{ expiration: Duration.days(30) }],
		});

		const zuoraOAuthPolicy = new AllowZuoraOAuthSecretsPolicy(this);

		const queryLambda = new SrLambda(this, 'QueryLambda', {
			nameSuffix: 'query',
			lambdaOverrides: {
				description:
					'Submits a Zuora query for the subscriptions billing on a date',
			},
		});
		queryLambda.addPolicies(zuoraOAuthPolicy);

		const fetchLambda = new SrLambda(this, 'FetchLambda', {
			nameSuffix: 'fetch',
			lambdaOverrides: {
				description:
					'Writes the results of the Zuora query to S3, one item per subscription',
				timeout: Duration.minutes(5),
				environment: { BUCKET_NAME: bucket.bucketName },
			},
		});
		fetchLambda.addPolicies(zuoraOAuthPolicy);
		bucket.grantPut(fetchLambda);

		// created explicitly so the charge-not-billing metric filter can be attached to it
		const processorLogGroup = new LogGroup(this, 'ProcessorLogGroup', {
			logGroupName: `/aws/lambda/email-reminders-processor-${this.stage}`,
			retention: RetentionDays.ONE_MONTH,
		});

		const processorLambda = new SrLambda(this, 'ProcessorLambda', {
			nameSuffix: 'processor',
			lambdaOverrides: {
				description:
					'Decides which reminder or notice email, if any, a subscriber is due',
				timeout: Duration.minutes(1),
				logGroup: processorLogGroup,
			},
		});
		processorLambda.addPolicies(zuoraOAuthPolicy);

		const query = new LambdaInvoke(this, 'QueryZuora', {
			lambdaFunction: queryLambda,
			payloadResponseOnly: true,
		});

		const fetchResults = new LambdaInvoke(this, 'FetchResults', {
			lambdaFunction: fetchLambda,
			payloadResponseOnly: true,
		}).addRetry({
			errors: ['QueryNotCompleteError'],
			interval: Duration.minutes(1),
			maxAttempts: 20,
			backoffRate: 1,
		});

		const processSubscriptions = new DistributedMap(
			this,
			'ProcessSubscriptions',
			{
				comment:
					'MaxConcurrency limits concurrent Zuora requests. Failures are tolerated so one subscription does not stop the rest; they fail the execution afterwards',
				// each item is one short lambda call, which Express executions make much cheaper
				mapExecutionType: StateMachineType.EXPRESS,
				maxConcurrency: 10,
				toleratedFailurePercentage: 100,
				itemReader: new S3JsonItemReader({
					bucket,
					key: JsonPath.stringAt('$.key'),
				}),
				itemSelector: {
					'subscriptionNumber.$': '$$.Map.Item.Value.subscriptionNumber',
					'accountNumber.$': '$$.Map.Item.Value.accountNumber',
					'billingDate.$': '$.billingDate',
				},
				resultWriterV2: new ResultWriterV2({
					bucket,
					prefix: JsonPath.format(
						'{}/results',
						JsonPath.stringAt('$.billingDate'),
					),
				}),
				resultPath: '$.map',
			},
		).itemProcessor(
			new LambdaInvoke(this, 'ProcessSubscription', {
				lambdaFunction: processorLambda,
				payloadResponseOnly: true,
			}).addRetry({
				errors: ['States.ALL'],
				interval: Duration.seconds(10),
				maxAttempts: 2,
				backoffRate: 2,
			}),
			{
				mode: ProcessorMode.DISTRIBUTED,
				executionType: ProcessorType.EXPRESS,
			},
		);

		const getMapResult = new CustomState(this, 'GetMapResult', {
			stateJson: {
				Type: 'Task',
				Resource: 'arn:aws:states:::aws-sdk:s3:getObject',
				Parameters: {
					'Bucket.$': JsonPath.stringAt('$.map.ResultWriterDetails.Bucket'),
					'Key.$': JsonPath.stringAt('$.map.ResultWriterDetails.Key'),
				},
				ResultSelector: {
					'Payload.$': JsonPath.stringToJson(JsonPath.stringAt('$.Body')),
				},
				OutputPath: '$.Payload',
			},
		});

		const checkForFailures = new Choice(this, 'CheckForFailures')
			.when(
				Condition.isPresent('$.ResultFiles.FAILED[0]'),
				new Fail(this, 'SomeSubscriptionsFailed', {
					cause:
						'Some subscriptions could not be processed, see the FAILED results file in S3',
				}),
			)
			.otherwise(new Succeed(this, 'AllSubscriptionsProcessed'));

		const checkForSubscriptions = new Choice(this, 'CheckForSubscriptions')
			.when(
				Condition.numberEquals('$.count', 0),
				// a normal day has thousands, so none means the query is wrong
				new Fail(this, 'NoSubscriptionsFound', {
					cause: 'The Zuora query found no subscriptions billing on the date',
				}),
			)
			.otherwise(
				processSubscriptions.next(getMapResult).next(checkForFailures),
			);

		const stateMachine = new StateMachine(this, 'StateMachine', {
			stateMachineName: `${this.app}-${this.stage}`,
			timeout: Duration.hours(3),
			definitionBody: DefinitionBody.fromChainable(
				query
					.next(
						new Wait(this, 'WaitForZuora', {
							time: WaitTime.duration(Duration.seconds(30)),
						}),
					)
					.next(fetchResults)
					.next(checkForSubscriptions),
			),
		});

		// 03:00 UTC is a quiet period that avoids the bill run and payment run times.
		// Processes today unless the input is { "date": "YYYY-MM-DD" }, which re-runs that day
		new Rule(this, 'DailySchedule', {
			schedule: Schedule.cron({ minute: '0', hour: '3' }),
			targets: [new SfnStateMachine(stateMachine)],
			enabled: this.stage === 'PROD',
		});

		const lambdaFunctionNames = [
			queryLambda.functionName,
			fetchLambda.functionName,
			processorLambda.functionName,
		];

		new SrLambdaAlarm(this, 'StateMachineFailureAlarm', {
			app: this.app,
			lambdaFunctionNames,
			alarmName: `${this.app}-${this.stage} step function failed`,
			alarmDescription: `The ${this.app}-${this.stage} step function failed or timed out. Check the execution in the Step Functions console; a day can be re-run by starting an execution with { "date": "YYYY-MM-DD" }. Impact: ${errorImpact}`,
			// a run that hits the timeout ends as TimedOut, not Failed
			metric: new MathExpression({
				expression: 'failed + timedOut',
				usingMetrics: {
					failed: stateMachine.metricFailed({ statistic: 'Sum' }),
					timedOut: stateMachine.metricTimedOut({ statistic: 'Sum' }),
				},
				period: Duration.minutes(5),
			}),
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			threshold: 1,
			evaluationPeriods: 1,
			treatMissingData: TreatMissingData.NOT_BREACHING,
		});

		const chargeNotBillingFilter = new MetricFilter(
			this,
			'ChargeNotBillingMetricFilter',
			{
				logGroup: processorLogGroup,
				filterPattern: FilterPattern.literal(
					'"EMAIL_REMINDER_CHARGE_NOT_BILLING"',
				),
				metricNamespace: `support-service-lambdas-${this.stage}`,
				metricName: 'email-reminders-charge-not-billing',
				metricValue: '1',
			},
		);

		new SrLambdaAlarm(this, 'ChargeNotBillingAlarm', {
			app: this.app,
			lambdaFunctionNames: processorLambda.functionName,
			alarmName: `${this.app}-${this.stage} subscription no longer billing on the queried date`,
			alarmDescription: `A subscription changed between the Zuora query and it being processed, so it may not have been evaluated. Search the processor logs for EMAIL_REMINDER_CHARGE_NOT_BILLING. Impact: ${errorImpact}`,
			metric: chargeNotBillingFilter.metric({
				statistic: 'Sum',
				period: Duration.hours(1),
			}),
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			threshold: 0,
			evaluationPeriods: 1,
			treatMissingData: TreatMissingData.NOT_BREACHING,
		});
	}
}
