import { Duration } from 'aws-cdk-lib';
import { ComparisonOperator } from 'aws-cdk-lib/aws-cloudwatch';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import type { Construct } from 'constructs';
import type { SrLambdaProps } from './SrLambda';
import { getNameWithStage, SrLambda } from './SrLambda';
import type { SrMonitoring } from './SrLambdaAlarm';
import { SrLambdaAlarm } from './SrLambdaAlarm';
import type { SrStack } from './SrStack';

type SrSqsLambdaProps = SrLambdaProps & {
	/**
	 * do we want to disable standard SrCDK alarm or override any properties?
	 */
	monitoring: SrMonitoring;
	/**
	 * The number of times a message can be unsuccessfully dequeued before being moved to the dead-letter queue.
	 */
	readonly maxReceiveCount: number;
	/**
	 * Timeout of processing a single message.
	 *
	 * After dequeuing, the processor has this much time to handle the message
	 * and delete it from the queue before it becomes visible again for dequeueing
	 * by another processor.
	 *
	 * Values must be from 0 to 43200 seconds (12 hours). If you don't specify
	 * a value, AWS CloudFormation uses the default value of 30 seconds.
	 *
	 * @default Duration.seconds(30)
	 */
	readonly visibilityTimeout?: Duration;
	/**
	 * legacy IDs, to avoid having to drop and recreate an existing stack
	 */
	legacyQueueIds?: { queue: string; dlq: string };
};

/**
 * This creates a lambda triggered by new SQS queue, according to SR standards.
 *
 * It comes with a default queue, dlq and alarm.
 */
export class SrSqsLambda extends SrLambda implements Construct {
	readonly inputQueue: Queue;
	readonly inputDeadLetterQueue: Queue;
	constructor(scope: SrStack, id: string, props: SrSqsLambdaProps) {
		const finalProps = {
			nameSuffix: props.nameSuffix,
			lambdaOverrides: props.lambdaOverrides,
			legacyId: props.legacyId,
		};

		super(scope, id, finalProps);

		const dlqName = getNameWithStage(scope, props.nameSuffix, 'dlq');
		this.inputDeadLetterQueue = new Queue(
			scope,
			props.legacyQueueIds?.dlq ?? 'DLQ',
			{
				queueName: dlqName,
				retentionPeriod: Duration.days(14),
			},
		);

		const queueName = getNameWithStage(scope, props.nameSuffix, 'queue');
		this.inputQueue = new Queue(scope, props.legacyQueueIds?.queue ?? 'Queue', {
			queueName,
			deadLetterQueue: {
				queue: this.inputDeadLetterQueue,
				maxReceiveCount: props.maxReceiveCount,
			},
			visibilityTimeout: props.visibilityTimeout,
		});

		super.addEventSource(new SqsEventSource(this.inputQueue));

		if (scope.stage === 'PROD' && !props.monitoring.noMonitoring) {
			new SrLambdaAlarm(scope, 'Alarm', {
				lambdaFunctionNames: this.functionName,
				app: scope.app,
				alarmName: this.inputDeadLetterQueue.queueName + ' has messages',
				alarmDescription:
					scope.app +
					' could not process a message and it ended up on the DLQ. Search the logs below for "error" for more information. Impact: ' +
					props.monitoring.errorImpact,
				metric: this.inputDeadLetterQueue
					.metric('ApproximateNumberOfMessagesVisible')
					.with({ statistic: 'Sum', period: Duration.minutes(1) }),
				comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
				threshold: 0,
				evaluationPeriods: 1,
				...props.monitoring,
			});
		}
	}
}
