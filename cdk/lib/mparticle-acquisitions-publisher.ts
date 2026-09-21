import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	ComparisonOperator,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { SqsQueue } from 'aws-cdk-lib/aws-events-targets';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { SrLambda } from './cdk/SrLambda';
import { SrLambdaAlarm } from './cdk/SrLambdaAlarm';
import { SrLambdaErrorAlarm } from './cdk/SrLambdaErrorAlarm';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

const app = 'mparticle-acquisitions-publisher';

export class MparticleAcquisitionsPublisher extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app });

		const lambda = new SrLambda(this, 'Lambda', {
			lambdaOverrides: {
				description:
					'Consumes acquisition events and publishes paid-media purchase events to mParticle',
				timeout: Duration.minutes(2),
			},
		});

		lambda.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ['ssm:GetParameter'],
				resources: [
					`arn:aws:ssm:${this.region}:${this.account}:parameter/${this.stage}/${this.stack}/mparticle-api/inputPlatform/key`,
					`arn:aws:ssm:${this.region}:${this.account}:parameter/${this.stage}/${this.stack}/mparticle-api/inputPlatform/secret`,
				],
			}),
		);

		const eventBridgeDlq = new Queue(this, 'EventBridgeDlq', {
			queueName: `${app}-eventbridge-dlq-${this.stage}`,
			retentionPeriod: Duration.days(14),
		});
		const publisherDlq = new Queue(this, 'PublisherDlq', {
			queueName: `${app}-dlq-${this.stage}`,
			retentionPeriod: Duration.days(14),
		});
		const publisherQueue = new Queue(this, 'PublisherQueue', {
			queueName: `${app}-queue-${this.stage}`,
			visibilityTimeout: Duration.minutes(5),
			deadLetterQueue: {
				queue: publisherDlq,
				maxReceiveCount: 3,
			},
		});

		lambda.addEventSource(
			new SqsEventSource(publisherQueue, {
				batchSize: 10,
				maxBatchingWindow: Duration.seconds(5),
				reportBatchItemFailures: true,
			}),
		);

		const acquisitionsBus = EventBus.fromEventBusArn(
			this,
			'AcquisitionsBus',
			`arn:aws:events:eu-west-1:865473395570:event-bus/acquisitions-bus-${this.stage}`,
		);
		const acquisitionsToMparticleRule = new Rule(
			this,
			'AcquisitionsToMparticleRule',
			{
				ruleName: `${app}-${this.stage}`,
				description: 'Send acquisition events to the mParticle publisher queue',
				eventBus: acquisitionsBus,
				eventPattern: {
					detailType: ['AcquisitionsEvent'],
				},
			},
		);
		acquisitionsToMparticleRule.addTarget(
			new SqsQueue(publisherQueue, {
				deadLetterQueue: eventBridgeDlq,
				retryAttempts: 3,
				maxEventAge: Duration.hours(2),
			}),
		);

		const errorImpact =
			'Paid-media acquisition events are not being delivered to mParticle';
		new SrLambdaErrorAlarm(this, 'LambdaErrorAlarm', {
			lambdaFunctionName: lambda.functionName,
			errorImpact,
		});
		new SrLambdaAlarm(this, 'PublisherDlqAlarm', {
			app: this.app,
			alarmName: `${this.stage} ${app} publisher DLQ has messages`,
			alarmDescription:
				'Inspect the mParticle publisher DLQ, correct the mapping/configuration or external API failure, and redrive the messages.',
			lambdaFunctionNames: lambda.functionName,
			metric: publisherDlq.metricApproximateNumberOfMessagesVisible({
				period: Duration.minutes(5),
				statistic: 'Maximum',
			}),
			threshold: 1,
			evaluationPeriods: 1,
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: TreatMissingData.NOT_BREACHING,
		});
		new SrLambdaAlarm(this, 'EventBridgeDlqAlarm', {
			app: this.app,
			alarmName: `${this.stage} ${app} EventBridge DLQ has messages`,
			alarmDescription:
				'EventBridge could not deliver acquisition events to the mParticle publisher queue after retries; inspect the delivery DLQ and rule permissions.',
			lambdaFunctionNames: lambda.functionName,
			metric: eventBridgeDlq.metricApproximateNumberOfMessagesVisible({
				period: Duration.minutes(5),
				statistic: 'Maximum',
			}),
			threshold: 1,
			evaluationPeriods: 1,
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: TreatMissingData.NOT_BREACHING,
		});
	}
}
