import { GuApiLambda } from '@guardian/cdk';
import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import type { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	ComparisonOperator,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { SrLambda } from './cdk/sr-lambda';
import { SrRestDomain } from './cdk/sr-rest-domain';
import type { SrStageNames } from './cdk/sr-stack';
import { SrStack } from './cdk/sr-stack';
import { nodeVersion } from './node-version';

type GuLambdaFunctionOrApi = GuLambdaFunction | GuApiLambda;
type GuLambdaFunctionOrApiItem = {
	name: string;
	lambda: GuLambdaFunctionOrApi;
};

export class StripeDisputes extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, {
			stage,
			app: 'stripe-disputes',
		});

		const app = this.app;
		const nameWithStageProducer = `${app}-producer-${this.stage}`;

		// ---- SQS Queues with retry and DLQ ---- //
		const deadLetterQueue = new Queue(this, `dead-letters-${app}-queue`, {
			queueName: `dead-letters-${app}-queue-${this.stage}`,
			retentionPeriod: Duration.days(14),
		});

		const disputeEventsQueue = new Queue(this, `${app}-events-queue`, {
			queueName: `${app}-events-queue-${this.stage}`,
			deadLetterQueue: {
				queue: deadLetterQueue,
				maxReceiveCount: 3, // 3 retries before going to DLQ
			},
			visibilityTimeout: Duration.seconds(300), // Match lambda timeout
		});

		// ---- CloudWatch Alarm for DLQ monitoring ---- //
		new GuAlarm(this, 'DeadLetterQueueAlarm', {
			app: app,
			alarmName: `${this.stage} ${app} - Failed to process dispute webhook`,
			alarmDescription:
				`There are one or more failed dispute webhook events in the ${app} dead letter queue (DLQ). ` +
				`Check the attributes of the failed message(s) for details of the error and ` +
				'ensure the Stripe webhook processing is working correctly.\n' +
				`DLQ: https://${this.region}.console.aws.amazon.com/sqs/v2/home?region=${this.region}#/queues/https%3A%2F%2Fsqs.${this.region}.amazonaws.com%2F${this.account}%2F${deadLetterQueue.queueName}`,
			metric: deadLetterQueue.metricApproximateNumberOfMessagesVisible(),
			threshold: 1,
			evaluationPeriods: 1,
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: TreatMissingData.IGNORE,
			snsTopicName: `alarms-handler-topic-${this.stage}`,
			actionsEnabled: this.stage === 'PROD',
		});

		const commonEnvironmentVariables = {
			App: app,
			Stack: this.stack,
			Stage: this.stage,
			DISPUTE_EVENTS_QUEUE_URL: disputeEventsQueue.queueUrl,
		};

		// ---- API-triggered lambda functions ---- //
		const lambdaProducer = new GuApiLambda(this, `${app}-lambda-producer`, {
			description:
				'A lambda that handles stripe disputes webhook events and processes SQS events',
			functionName: nameWithStageProducer,
			loggingFormat: LoggingFormat.TEXT,
			fileName: `${app}.zip`,
			handler: 'producer.handler',
			runtime: nodeVersion,
			memorySize: 1024,
			timeout: Duration.seconds(300),
			environment: commonEnvironmentVariables,
			monitoringConfiguration: {
				noMonitoring: true, // There is a threshold alarm defined below
			},
			app: app,
			api: {
				id: nameWithStageProducer,
				restApiName: nameWithStageProducer,
				description:
					'API Gateway for Stripe dispute webhooks (sync response) with SQS event processing',
				proxy: true,
				deployOptions: {
					stageName: this.stage,
				},
			},
			events: [],
		});

		const lambdaConsumer = new SrLambda(
			this,
			`${app}-lambda-consumer`,
			{
				description: 'A lambda that handles stripe disputes SQS events',
				handler: 'consumer.handler',
				timeout: Duration.seconds(300),
				environment: commonEnvironmentVariables,
				events: [
					new SqsEventSource(disputeEventsQueue, {
						batchSize: 1, // Process one dispute event at a time
						maxBatchingWindow: Duration.seconds(0), // Process immediately
					}),
				],
			},
			{ nameSuffix: 'consumer' },
		);

		lambdaProducer.api.addUsagePlan('UsagePlan', {
			name: nameWithStageProducer,
			description: 'REST endpoints for stripe disputes webhook api',
			apiStages: [
				{
					stage: lambdaProducer.api.deploymentStage,
					api: lambdaProducer.api,
				},
			],
		});

		this.createPolicyAndAttachToLambdas(
			[
				{ lambda: lambdaProducer, name: 'Lambda producer' },
				{ lambda: lambdaConsumer, name: 'Lambda Consumer' },
			],
			[
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['s3:GetObject'],
					resources: [
						`arn:aws:s3::*:membership-dist/${this.stack}/${this.stage}/${app}/`,
					],
				}),
			],
			'Allow S3 Get Object',
		);

		this.createPolicyAndAttachToLambdas(
			[{ lambda: lambdaConsumer, name: 'Lambda Consumer' }],
			[
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['secretsmanager:GetSecretValue'],
					resources: [
						`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${this.stage}/Zuora-OAuth/SupportServiceLambdas-*`,
						`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${this.stage}/Salesforce/ConnectedApp/StripeDisputeWebhooks-*`,
					],
				}),
			],
			'Allow Secrets Manager Get Secret Value',
		);

		this.createPolicyAndAttachToLambdas(
			[{ lambda: lambdaProducer, name: 'Lambda Producer' }],
			[
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['secretsmanager:GetSecretValue'],
					resources: [
						`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${this.stage}/Stripe/ConnectedApp/StripeDisputeWebhooks-*`,
					],
				}),
			],
			'Allow Secrets Manager Get Secret Value',
		);

		this.createPolicyAndAttachToLambdas(
			[{ lambda: lambdaConsumer, name: 'Lambda Consumer' }],
			[
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['sqs:sendmessage'],
					resources: [
						`arn:aws:sqs:${this.region}:${this.account}:braze-emails-${this.stage}`,
					],
				}),
			],
			'Allow SQS SendMessage to Braze Emails Queue',
		);

		this.createPolicyAndAttachToLambdas(
			[
				{ lambda: lambdaProducer, name: 'Lambda producer' },
				{ lambda: lambdaConsumer, name: 'Lambda Consumer' },
			],
			[
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['sqs:SendMessage', 'sqs:GetQueueAttributes'],
					resources: [disputeEventsQueue.queueArn],
				}),
			],
			'Allow SQS SendMessage and GetQueueAttributes to Dispute Events Queue',
		);

		new SrRestDomain(this, lambdaProducer.api);
	}

	createPolicyAndAttachToLambdas(
		lambdasFunctions: GuLambdaFunctionOrApiItem[],
		statements: PolicyStatement[],
		policyName: string,
	) {
		lambdasFunctions.forEach((lambdaFunction: GuLambdaFunctionOrApiItem) => {
			const policy = new Policy(
				this,
				`${policyName} on ${lambdaFunction.name}`,
				{
					statements: statements,
				},
			);
			lambdaFunction.lambda.role?.attachInlinePolicy(policy);
		});
		return;
	}
}
