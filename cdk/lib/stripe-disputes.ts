import { GuApiLambda } from '@guardian/cdk';
import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { CfnBasePathMapping, CfnDomainName } from 'aws-cdk-lib/aws-apigateway';
import {
	ComparisonOperator,
	Metric,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { CfnRecordSet } from 'aws-cdk-lib/aws-route53';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { SrLambdaAlarm } from './cdk/sr-lambda-alarm';
import { nodeVersion } from './node-version';

export interface StripeDisputesProps extends GuStackProps {
	stack: string;
	stage: string;
	certificateId: string;
	domainName: string;
	hostedZoneId: string;
}

type GuLambdaFunctionOrApi = GuLambdaFunction | GuApiLambda;
type GuLambdaFunctionOrApiItem = {
	name: string;
	lambda: GuLambdaFunctionOrApi;
};

export class StripeDisputes extends GuStack {
	constructor(scope: App, id: string, props: StripeDisputesProps) {
		super(scope, id, props);

		const app = 'stripe-disputes';
		const nameWithStageProducer = `${app}-producer-${this.stage}`;
		const nameWithStageConsumer = `${app}-consumer-${this.stage}`;

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

		const lambdaConsumer = new GuLambdaFunction(
			this,
			`${app}-lambda-consumer`,
			{
				description: 'A lambda that handles stripe disputes SQS events',
				functionName: nameWithStageConsumer,
				loggingFormat: LoggingFormat.TEXT,
				fileName: `${app}.zip`,
				handler: 'consumer.handler',
				runtime: nodeVersion,
				memorySize: 1024,
				timeout: Duration.seconds(300),
				environment: commonEnvironmentVariables,
				app: app,
				events: [
					new SqsEventSource(disputeEventsQueue, {
						batchSize: 1, // Process one dispute event at a time
						maxBatchingWindow: Duration.seconds(0), // Process immediately
					}),
				],
			},
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
					actions: ['sqs:SendMessage', 'sqs:GetQueueUrl'],
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

		// ---- Lambda Alarms ---- //

		// Consumer Lambda Error Rate Alarm
		new SrLambdaAlarm(this, 'ConsumerLambdaErrorAlarm', {
			app: app,
			alarmName: `${this.stage} ${app} - Consumer Lambda high error rate`,
			alarmDescription:
				`The ${app} consumer Lambda has experienced more than 3 errors in 5 minutes. ` +
				`This indicates failures in processing dispute webhooks from SQS. ` +
				`Check CloudWatch logs: https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#logsV2:log-groups/log-group/$252Faws$252Flambda$252F${nameWithStageConsumer}\n` +
				`Common causes: Salesforce API errors, Zuora API errors, malformed webhook data`,
			lambdaFunctionNames: nameWithStageConsumer,
			metric: new Metric({
				metricName: 'Errors',
				namespace: 'AWS/Lambda',
				statistic: 'Sum',
				period: Duration.minutes(5),
				dimensionsMap: {
					FunctionName: nameWithStageConsumer,
				},
			}),
			threshold: 3, // 3 errors in 5 minutes
			evaluationPeriods: 1,
			comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
			treatMissingData: TreatMissingData.NOT_BREACHING,
		});

		// Producer API Gateway 5XX Alarm
		new SrLambdaAlarm(this, 'ProducerApiGateway5XXAlarm', {
			app: app,
			alarmName: `${this.stage} ${app} - Producer API 5XX errors`,
			alarmDescription:
				`The ${app} producer API is returning 5XX errors. ` +
				`This prevents Stripe from delivering webhook events. ` +
				`Check for Lambda errors, timeout issues, or signature verification failures. ` +
				`Logs: https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#logsV2:log-groups/log-group/$252Faws$252Flambda$252F${nameWithStageProducer}`,
			lambdaFunctionNames: nameWithStageProducer,
			metric: new Metric({
				metricName: '5XXError',
				namespace: 'AWS/ApiGateway',
				statistic: 'Sum',
				period: Duration.minutes(5),
				dimensionsMap: {
					ApiName: nameWithStageProducer,
				},
			}),
			threshold: 1,
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
				`Check Stripe webhook configuration and secret key. ` +
				`Logs: https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#logsV2:log-groups/log-group/$252Faws$252Flambda$252F${nameWithStageProducer}`,
			lambdaFunctionNames: nameWithStageProducer,
			metric: new Metric({
				metricName: '4XXError',
				namespace: 'AWS/ApiGateway',
				statistic: 'Sum',
				period: Duration.minutes(5),
				dimensionsMap: {
					ApiName: nameWithStageProducer,
				},
			}),
			threshold: 10, // More than 10 4XX errors in 5 minutes
			evaluationPeriods: 1,
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			treatMissingData: TreatMissingData.NOT_BREACHING,
		});

		// SQS Message Age Alarm
		new GuAlarm(this, 'SQSMessageAgeAlarm', {
			app: app,
			alarmName: `${this.stage} ${app} - SQS messages taking too long to process`,
			alarmDescription:
				`Messages in the ${app} queue are older than 5 minutes. ` +
				`This indicates the consumer Lambda is not processing messages fast enough. ` +
				`Check for Lambda throttling or processing errors. ` +
				`Queue: https://${this.region}.console.aws.amazon.com/sqs/v2/home?region=${this.region}#/queues/https%3A%2F%2Fsqs.${this.region}.amazonaws.com%2F${this.account}%2F${disputeEventsQueue.queueName}`,
			metric: disputeEventsQueue.metricApproximateAgeOfOldestMessage(),
			threshold: 300000, // 5 minutes in milliseconds
			evaluationPeriods: 1,
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			treatMissingData: TreatMissingData.NOT_BREACHING,
			snsTopicName: `alarms-handler-topic-${this.stage}`,
			actionsEnabled: this.stage === 'PROD',
		});

		// ---- DNS ---- //
		const certificateArn = `arn:aws:acm:eu-west-1:${this.account}:certificate/${props.certificateId}`;
		const cfnDomainName = new CfnDomainName(this, 'DomainName', {
			domainName: props.domainName,
			regionalCertificateArn: certificateArn,
			endpointConfiguration: {
				types: ['REGIONAL'],
			},
		});

		new CfnBasePathMapping(this, 'BasePathMapping', {
			domainName: cfnDomainName.ref,
			restApiId: lambdaProducer.api.restApiId,
			stage: lambdaProducer.api.deploymentStage.stageName,
		});

		new CfnRecordSet(this, 'DNSRecord', {
			name: props.domainName,
			type: 'CNAME',
			hostedZoneId: props.hostedZoneId,
			ttl: '120',
			resourceRecords: [cfnDomainName.attrRegionalDomainName],
		});
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
