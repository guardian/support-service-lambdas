import type { NoMonitoring } from '@guardian/cdk/lib/constructs/cloudwatch';
import { Duration } from 'aws-cdk-lib';
import { ComparisonOperator } from 'aws-cdk-lib/aws-cloudwatch';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import type { SrLambdaProps } from './SrLambda';
import { getId, getNameWithStage, SrLambda } from './SrLambda';
import type { SrLambdaAlarmProps } from './SrLambdaAlarm';
import { SrLambdaAlarm } from './SrLambdaAlarm';
import type { SrStack } from './SrStack';

type SrSqsLambdaProps = SrLambdaProps & {
	/**
	 * If something ends up on the DLQ, what will the negative impact be on a user or our system.
	 * This is important as it is used in alarms for triaging issues.
	 */
	errorImpact: string;
	/**
	 * do we want to disable standard SrCDK alarm or override any properties?
	 */
	monitoring?:
		| NoMonitoring
		| (Partial<SrLambdaAlarmProps> & { noMonitoring?: false });
};

/**
 * This creates a lambda triggered by new SQS queue, according to SR standards.
 *
 * It comes with a default queue, dlq and alarm.
 */
export class SrSqsLambda extends SrLambda {
	readonly inputQueue: Queue;
	readonly inputDeadLetterQueue: Queue;
	constructor(scope: SrStack, props: SrSqsLambdaProps) {
		const finalProps = {
			nameSuffix: props.nameSuffix,
			lambdaOverrides: props.lambdaOverrides,
		};

		super(scope, finalProps);

		const dlqName = getNameWithStage(scope, props.nameSuffix, 'dlq');
		this.inputDeadLetterQueue = new Queue(
			scope,
			getId(props.nameSuffix, 'dlq'),
			{
				queueName: dlqName,
				retentionPeriod: Duration.days(14),
			},
		);

		const queueName = getNameWithStage(scope, props.nameSuffix, 'queue');
		this.inputQueue = new Queue(scope, getId(props.nameSuffix, 'queue'), {
			queueName,
			deadLetterQueue: {
				queue: this.inputDeadLetterQueue,
				maxReceiveCount: 3,
			},
		});

		super.addEventSource(new SqsEventSource(this.inputQueue));

		if (!props.monitoring?.noMonitoring) {
			new SrLambdaAlarm(scope, getId(props.nameSuffix, 'alarm'), {
				lambdaFunctionNames: this.functionName,
				app: scope.app,
				alarmName: this.inputDeadLetterQueue.queueName + ' has messages',
				alarmDescription:
					scope.app +
					' could not process a message and it ended up on the DLQ search the logs below for "error" for more information. Impact: ' +
					props.errorImpact,
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
