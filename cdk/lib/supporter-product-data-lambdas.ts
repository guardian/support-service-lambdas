import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	Alarm,
	ComparisonOperator,
	MathExpression,
	Metric,
	TreatMissingData,
	Unit,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Rule, RuleTargetInput, Schedule } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine } from 'aws-cdk-lib/aws-events-targets';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import {
	Choice,
	Condition,
	DefinitionBody,
	StateMachine,
	Succeed,
	Wait,
	WaitTime,
} from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { AllowZuoraOAuthSecretsPolicy } from './cdk/policies';
import { SrLambda } from './cdk/SrLambda';
import { SrLambdaErrorAlarm } from './cdk/SrLambdaErrorAlarm';
import type { SrStackProps } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

type SupporterProductDataLambdasProps = SrStackProps & {
	processItemMaxConcurrency: number;
};

export class SupporterProductDataLambdas extends SrStack {
	constructor(scope: App, props: SupporterProductDataLambdasProps) {
		super(scope, props);

		const { processItemMaxConcurrency } = props;

		const queue = new Queue(this, 'SupporterProductDataQueue', {
			queueName: `supporter-product-data-lambdas-${this.stage}`,
			visibilityTimeout: Duration.minutes(10),
			deadLetterQueue: {
				queue: new Queue(this, 'SupporterProductDataDeadLetterQueue', {
					queueName: `dead-letters-supporter-product-data-lambdas-${this.stage}`,
				}),
				maxReceiveCount: 10,
			},
		});

		// Policies shared across all lambdas — applied after lambda creation via addToRolePolicy
		const ssmPolicy = new PolicyStatement({
			effect: Effect.ALLOW,
			actions: [
				'ssm:GetParametersByPath',
				'ssm:GetParameter',
				'ssm:PutParameter',
			],
			// Non-standard path used by this app — not covered by the GuCDK auto-policy (which uses /${stage}/${stack}/${app})
			resources: [
				`arn:aws:ssm:${this.region}:${this.account}:parameter/supporter-product-data/${this.stage}/*`,
			],
		});
		const s3Policy = new PolicyStatement({
			effect: Effect.ALLOW,
			actions: ['s3:PutObject', 's3:GetObject'],
			resources: [
				`arn:aws:s3:::supporter-product-data-export-${this.stage.toLowerCase()}/*`,
			],
		});
		const dynamoPolicy = new PolicyStatement({
			effect: Effect.ALLOW,
			actions: ['dynamodb:UpdateItem', 'dynamodb:PutItem', 'dynamodb:GetItem'],
			resources: [
				`arn:aws:dynamodb:${this.region}:${this.account}:table/SupporterProductData-${this.stage}`,
			],
		});
		const cloudwatchPolicy = new PolicyStatement({
			effect: Effect.ALLOW,
			actions: ['cloudwatch:PutMetricData'],
			resources: ['*'],
		});
		const zuoraPolicy = new AllowZuoraOAuthSecretsPolicy(this);

		const addSharedPolicies = (lambda: SrLambda) => {
			lambda.addToRolePolicy(ssmPolicy);
			lambda.addToRolePolicy(s3Policy);
			lambda.addToRolePolicy(dynamoPolicy);
			lambda.addToRolePolicy(cloudwatchPolicy);
			lambda.addPolicies(zuoraPolicy);
		};

		const queryZuora = new SrLambda(this, 'QueryZuoraLambda', {
			legacyId: `supporterProductData-QueryZuora-${this.stage}`,
			lambdaOverrides: {
				timeout: Duration.minutes(5),
				memorySize: 512,
				environment: { STAGE: this.stage },
				description:
					'A lambda that queries Zuora for new or updated subscriptions since the last successful run, and writes the results to S3',
			},
		});
		addSharedPolicies(queryZuora);

		const fetchResults = new SrLambda(this, 'FetchResultsLambda', {
			legacyId: `supporterProductData-FetchResults-${this.stage}`,
			lambdaOverrides: {
				timeout: Duration.minutes(5),
				memorySize: 512,
				environment: { STAGE: this.stage },
			},
		});
		addSharedPolicies(fetchResults);

		const addToQueue = new SrLambda(
			this,
			'AddSupporterRatePlanItemToQueueLambda',
			{
				legacyId: `supporterProductData-AddToQueue-${this.stage}`,
				lambdaOverrides: {
					timeout: Duration.minutes(10),
					memorySize: 1024,
					environment: { STAGE: this.stage },
				},
			},
		);
		addSharedPolicies(addToQueue);

		const processItem = new SrLambda(
			this,
			'ProcessSupporterRatePlanItemLambda',
			{
				legacyId: `supporterProductData-ProcessItem-${this.stage}`,
				lambdaOverrides: {
					timeout: Duration.minutes(10),
					memorySize: 1024,
					environment: { STAGE: this.stage },
				},
			},
		);
		addSharedPolicies(processItem);

		queue.grantSendMessages(addToQueue);
		queue.grantConsumeMessages(processItem);
		processItem.addEventSource(
			new SqsEventSource(queue, {
				batchSize: 10,
				maxBatchingWindow: Duration.seconds(5),
				// Limit the number of concurrent Lambda invocations consuming from the
				// queue to avoid hitting the account-level Lambda concurrency limit
				// when there are hundreds of thousands of records to process.
				// At batchSize 10 and maxConcurrency 50 this gives a throughput of
				// 500 items/invocation-cycle whilst leaving headroom for other lambdas.
				maxConcurrency: processItemMaxConcurrency,
			}),
		);

		const addToQueueAgainTask = new LambdaInvoke(this, 'AddToQueueAgainTask', {
			lambdaFunction: addToQueue,
			payloadResponseOnly: true,
		});

		const moreToProcess = new Choice(this, 'MoreToProcess');
		moreToProcess
			.when(
				Condition.numberLessThanJsonPath('$.processedCount', '$.recordCount'),
				addToQueueAgainTask,
			)
			.otherwise(new Succeed(this, 'Done'));

		addToQueueAgainTask.next(moreToProcess);

		const noNewSubscriptions = new Succeed(this, 'NoNewSubscriptions');

		const checkForNewSubscriptions = new Choice(
			this,
			'CheckForNewSubscriptions',
		);
		checkForNewSubscriptions
			.when(Condition.numberEquals('$.recordCount', 0), noNewSubscriptions)
			.otherwise(
				new LambdaInvoke(this, 'AddToQueueTask', {
					lambdaFunction: addToQueue,
					payloadResponseOnly: true,
				}).next(moreToProcess),
			);

		const definition = new LambdaInvoke(this, 'QueryZuoraTask', {
			lambdaFunction: queryZuora,
			payloadResponseOnly: true,
		})
			.next(
				new Wait(this, 'WaitForZuora', {
					time: WaitTime.duration(Duration.seconds(30)),
				}),
			)
			.next(
				new LambdaInvoke(this, 'FetchResultsTask', {
					lambdaFunction: fetchResults,
					payloadResponseOnly: true,
				}).addRetry({
					errors: ['States.ALL'],
					interval: Duration.seconds(60),
					maxAttempts: 20,
					backoffRate: 1,
				}),
			)
			.next(checkForNewSubscriptions);

		const stateMachine = new StateMachine(
			this,
			'SupporterProductDataStateMachine',
			{
				stateMachineName: `supporter-product-data-lambdas-${this.stage}`,
				definitionBody: DefinitionBody.fromChainable(definition),
			},
		);

		const scheduleExpression =
			this.stage === 'PROD' ? 'cron(*/5 * ? * * *)' : 'cron(0 9 ? * MON-FRI *)';

		new Rule(this, 'SupporterProductDataSchedule', {
			schedule: Schedule.expression(scheduleExpression),
			targets: [
				new SfnStateMachine(stateMachine, {
					input: RuleTargetInput.fromObject({ queryType: 'incremental' }),
				}),
			],
		});

		// Alarms — PROD only
		const alarmsTopic = Topic.fromTopicArn(
			this,
			'AlarmsHandlerTopic',
			`arn:aws:sns:${this.region}:${this.account}:alarms-handler-topic-${this.stage}`,
		);
		const addAlarmAction = (alarm: Alarm) => {
			if (this.stage === 'PROD') {
				alarm.addAlarmAction(new SnsAction(alarmsTopic));
			}
		};

		// Step function execution failure — suppresses alarms between 00:00-06:00 UTC
		// when Zuora is slow and failures are expected
		const executionFailuresMetric = new Metric({
			namespace: 'AWS/States',
			metricName: 'ExecutionsFailed',
			dimensionsMap: { StateMachineArn: stateMachine.stateMachineArn },
			statistic: 'Sum',
			period: Duration.seconds(60),
			unit: Unit.COUNT,
		});
		const executionFailureAlarm = new Alarm(this, 'ExecutionFailureAlarm', {
			alarmName: `Supporter Product Data step function Failure in ${this.stage}`,
			alarmDescription: `The supporter-product-data-lambdas-${this.stage} step function has failed. Check the Step Functions console for details.`,
			metric: new MathExpression({
				expression: 'IF(HOUR(errors) > 5, errors)',
				usingMetrics: { errors: executionFailuresMetric },
				period: Duration.seconds(60),
			}),
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			threshold: 1,
			evaluationPeriods: 1,
			treatMissingData: TreatMissingData.NOT_BREACHING,
		});
		addAlarmAction(executionFailureAlarm);

		// DLQ — messages appearing means a record failed processing after all retries
		const dlq = queue.deadLetterQueue!.queue;
		const dlqAlarm = new Alarm(this, 'UnprocessedRecordAlarm', {
			alarmName: `There was a failure processing a supporter record in the ProcessSupporterRatePlanItemLambda lambda in ${this.stage}`,
			alarmDescription:
				`Check the ${dlq.queueName} SQS dead-letter queue for details of the record which failed, ` +
				`and the ProcessSupporterRatePlanItemLambda CloudWatch logs for what went wrong.`,
			metric: new Metric({
				namespace: 'AWS/SQS',
				metricName: 'ApproximateNumberOfMessagesVisible',
				dimensionsMap: { QueueName: dlq.queueName },
				statistic: 'Average',
				period: Duration.seconds(60),
			}),
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			threshold: 1,
			evaluationPeriods: 1,
			treatMissingData: TreatMissingData.NOT_BREACHING,
		});
		addAlarmAction(dlqAlarm);

		const processItemErrorsAlarm = new SrLambdaErrorAlarm(
			this,
			'ProcessItemLambdaErrorsAlarm',
			{
				lambdaFunctionName: processItem.functionName,
				errorImpact: 'Supporter product data may not be up to date in DynamoDB',
			},
		);
		addAlarmAction(processItemErrorsAlarm);
	}
}
