import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import { GuAllowPolicy } from '@guardian/cdk/lib/constructs/iam';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	ComparisonOperator,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import {
	AllowGetSecretValuePolicy,
	AllowSqsSendPolicy,
	AllowZuoraOAuthSecretsPolicy,
} from './cdk/policies';
import { SrApiLambda } from './cdk/SrApiLambda';
import { SrLambdaAlarm } from './cdk/SrLambdaAlarm';
import { SrSqsLambda } from './cdk/SrSqsLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class StripeDisputes extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stack: 'support', stage, app: 'stripe-disputes' });

		const app = this.app;

		const lambdaConsumer = new SrSqsLambda(this, 'ConsumerLambda', {
			legacyId: `${app}-lambda-consumer`,
			nameSuffix: 'consumer',
			lambdaOverrides: {
				description: 'A lambda that handles stripe disputes SQS events',
				functionName: `${app}-consumer-${this.stage}`,
				handler: 'consumer.handler',
			},
			queueNameBase: `${app}-events`,
			monitoring: {
				errorImpact:
					`There are one or more failed dispute webhook events in the ${app} dead letter queue (DLQ). ` +
					`Check the attributes of the failed message(s) for details of the error and ` +
					'ensure the Stripe webhook processing is working correctly.',
			},
			maxReceiveCount: 3,
			visibilityTimeout: Duration.minutes(5), // Match lambda timeout
			legacyQueueIds: {
				queue: `${app}-events-queue`,
				dlq: `dead-letters-${app}-queue`,
				dlqNameOverride: `dead-letters-${app}-queue-${this.stage}`,
			},
		});

		const lambdaProducer = new SrApiLambda(this, `ProducerLambda`, {
			legacyId: `${app}-lambda-producer`,
			nameSuffix: 'producer',
			lambdaOverrides: {
				description:
					'A lambda that handles stripe disputes webhook events and processes SQS events',
				functionName: `${app}-producer-${this.stage}`,
				handler: 'producer.handler',
				environment: {
					DISPUTE_EVENTS_QUEUE_URL: lambdaConsumer.inputQueue.queueUrl,
				},
			},
			isPublic: true,
			monitoring: {
				errorImpact:
					`The ${app} producer API is returning 5XX errors. ` +
					`This prevents Stripe from delivering webhook events. ` +
					`Check for Lambda errors, timeout issues, or signature verification failures. `,
			},
		});

		const disputeEventsQueuePolicy = new GuAllowPolicy(
			this,
			'Allow SQS SendMessage and GetQueueAttributes to Dispute Events Queue',
			{
				actions: ['sqs:SendMessage', 'sqs:GetQueueAttributes'],
				resources: [lambdaConsumer.inputQueue.queueArn],
			},
		);

		lambdaProducer.addPolicies(
			new AllowGetSecretValuePolicy(
				this,
				'Stripe Webhooks Secrets Manager policy',
				'Salesforce/ConnectedApp/StripeDisputeWebhooks-*',
			),
			disputeEventsQueuePolicy,
		);

		lambdaConsumer.addPolicies(
			new AllowZuoraOAuthSecretsPolicy(this),
			new AllowGetSecretValuePolicy(
				this,
				'Salesforce Secrets Manager policy',
				'Salesforce/ConnectedApp/StripeDisputeWebhooks-*',
			),
			new AllowSqsSendPolicy(this, 'braze-emails'),
			disputeEventsQueuePolicy,
		);

		// ---- Extra Alarms ---- //

		// Consumer Lambda Error Rate Alarm
		new SrLambdaAlarm(this, 'ConsumerLambdaErrorAlarm', {
			app: app,
			alarmName: `${this.stage} ${app} - Consumer Lambda high error rate`,
			alarmDescription:
				`The ${app} consumer Lambda has experienced more than 3 errors in 5 minutes. ` +
				`This indicates failures in processing dispute webhooks from SQS. ` +
				`Common causes: Salesforce API errors, Zuora API errors, malformed webhook data`,
			lambdaFunctionNames: lambdaConsumer.functionName,
			metric: lambdaConsumer.metricErrors({
				statistic: 'Sum',
				period: Duration.minutes(5),
			}),
			threshold: 3, // 3 errors in 5 minutes
			evaluationPeriods: 1,
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: TreatMissingData.NOT_BREACHING,
		});

		// Producer API Gateway 4XX Alarm (high rate)
		new SrLambdaAlarm(this, 'ProducerApiGateway4XXAlarm', {
			app: app,
			alarmName: `${this.stage} ${app} - Producer API high 4XX error rate`,
			alarmDescription:
				`The ${app} producer API has high 4XX error rate (>10 in 5 min). ` +
				`This may indicate invalid webhook signatures or missing headers. ` +
				`Check Stripe webhook configuration and secret key. `,
			lambdaFunctionNames: lambdaProducer.functionName,
			metric: lambdaProducer.api.metricClientError({
				statistic: 'Sum',
				period: Duration.minutes(5),
			}),
			threshold: 10, // More than 10 4XX errors in 5 minutes
			evaluationPeriods: 1,
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			treatMissingData: TreatMissingData.NOT_BREACHING,
		});

		// SQS Message Age Alarm
		const fiveMinutes = 5 * 60 * 1000;
		new GuAlarm(this, 'SQSMessageAgeAlarm', {
			app: app,
			alarmName: `${this.stage} ${app} - SQS messages taking too long to process`,
			alarmDescription:
				`Messages in the ${app} queue are older than 5 minutes. ` +
				`This indicates the consumer Lambda is not processing messages fast enough. ` +
				`Check for Lambda throttling or processing errors. ` +
				`Queue: https://${this.region}.console.aws.amazon.com/sqs/v2/home?region=${this.region}#/queues/https%3A%2F%2Fsqs.${this.region}.amazonaws.com%2F${this.account}%2F${lambdaConsumer.inputQueue.queueName}`,
			metric: lambdaConsumer.inputQueue.metricApproximateAgeOfOldestMessage(),
			threshold: fiveMinutes,
			evaluationPeriods: 1,
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			treatMissingData: TreatMissingData.NOT_BREACHING,
			snsTopicName: `alarms-handler-topic-${this.stage}`,
			actionsEnabled: this.stage === 'PROD',
		});
	}
}
