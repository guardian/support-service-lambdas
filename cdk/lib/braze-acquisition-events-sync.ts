import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	ComparisonOperator,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { EventInvokeConfig } from 'aws-cdk-lib/aws-lambda';
import { SqsDestination } from 'aws-cdk-lib/aws-lambda-destinations';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { SrApiLambda } from './cdk/SrApiLambda';
import { SrLambdaAlarm } from './cdk/SrLambdaAlarm';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class BrazeAcquisitionEventsSync extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'braze-acquisition-events-sync' });

		const lambda = new SrApiLambda(this, 'Lambda', {
			lambdaOverrides: {
				description:
					'A lambda that enriches acquisitions events with Braze UUID and posts to Braze users/track',
				timeout: Duration.seconds(30),
			},
			monitoring: {
				errorImpact:
					'a user missing Braze UUID in their attributes will not have their acquisition event synced to Braze',
				alarmDescription:
					'braze-acquisition-events-sync returned a 5XX response. Quick triage: check API Gateway 5XX metrics for spike window, inspect lambda logs for the same timestamp, validate IDAPI response includes braze-uuid, and verify Braze /users/track response status and body.',
			},
			throttle: {
				rateLimit: 20,
				burstLimit: 10,
			},
		});

		const eventBusArn = `arn:aws:events:eu-west-1:865473395570:event-bus/acquisitions-bus-${this.stage}`;

		const acquisitionsBus = EventBus.fromEventBusArn(
			this,
			'AcquisitionsBus',
			eventBusArn,
		);

		const eventBridgeToLambdaDlq = new Queue(this, 'EventBridgeToLambdaDlq', {
			queueName: `braze-acquisition-events-sync-eventbridge-dlq-${this.stage}`,
			retentionPeriod: Duration.days(14),
		});

		const lambdaAsyncFailureDlq = new Queue(this, 'LambdaAsyncFailureDlq', {
			queueName: `braze-acquisition-events-sync-lambda-async-failure-dlq-${this.stage}`,
			retentionPeriod: Duration.days(14),
		});

		const acquisitionsToBrazeRule = new Rule(this, 'AcquisitionsToBrazeRule', {
			ruleName: `braze-acquisition-events-sync-${this.stage}`,
			eventBus: acquisitionsBus,
			eventPattern: {
				detailType: ['AcquisitionsEvent'],
			},
		});

		acquisitionsToBrazeRule.addTarget(
			new LambdaFunction(lambda, {
				deadLetterQueue: eventBridgeToLambdaDlq,
				retryAttempts: 3,
				maxEventAge: Duration.hours(2),
			}),
		);

		new EventInvokeConfig(this, 'LambdaAsyncInvokeConfig', {
			function: lambda,
			maxEventAge: Duration.hours(2),
			retryAttempts: 2,
			onFailure: new SqsDestination(lambdaAsyncFailureDlq),
		});

		const alarmsEnabled = this.stage === 'PROD';

		new SrLambdaAlarm(this, 'EventBridgeDlqAlarm', {
			app: this.app,
			alarmName: `${this.stage} braze-acquisition-events-sync eventbridge dlq has messages`,
			alarmDescription:
				'EventBridge could not invoke braze-acquisition-events-sync lambda after retries. Quick triage: inspect DLQ message attributes for invoke failure reason, confirm rule event pattern matches AcquisitionsEvent payload shape, verify lambda permissions from EventBridge, and redrive once root cause is fixed.',
			lambdaFunctionNames: lambda.functionName,
			metric: eventBridgeToLambdaDlq.metricApproximateNumberOfMessagesVisible({
				period: Duration.minutes(5),
				statistic: 'Maximum',
			}),
			threshold: 1,
			evaluationPeriods: 1,
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: TreatMissingData.NOT_BREACHING,
			actionsEnabled: alarmsEnabled,
		});

		new SrLambdaAlarm(this, 'LambdaAsyncFailureDlqAlarm', {
			app: this.app,
			alarmName: `${this.stage} braze-acquisition-events-sync lambda retries exhausted`,
			alarmDescription:
				'braze-acquisition-events-sync failed after async Lambda retries and the event was sent to the lambda async failure DLQ. Quick triage: inspect the DLQ message payload and request context, check lambda logs for the matching request ID, then redrive once the root cause is fixed.',
			lambdaFunctionNames: lambda.functionName,
			metric: lambdaAsyncFailureDlq.metricApproximateNumberOfMessagesVisible({
				period: Duration.minutes(5),
				statistic: 'Maximum',
			}),
			threshold: 1,
			evaluationPeriods: 1,
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: TreatMissingData.NOT_BREACHING,
			actionsEnabled: alarmsEnabled,
		});
	}
}
