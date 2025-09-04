import { GuApiLambda } from '@guardian/cdk';
import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import {
	ApiKeySourceType,
	CfnBasePathMapping,
	CfnDomainName,
} from 'aws-cdk-lib/aws-apigateway';
import {
	ComparisonOperator,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { CfnRecordSet } from 'aws-cdk-lib/aws-route53';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { nodeVersion } from './node-version';

export interface StripeDisputesProps extends GuStackProps {
	stack: string;
	stage: string;
	certificateId: string;
	domainName: string;
	hostedZoneId: string;
}

export class StripeDisputes extends GuStack {
	constructor(scope: App, id: string, props: StripeDisputesProps) {
		super(scope, id, props);

		const app = 'stripe-disputes';
		const nameWithStage = `${app}-${this.stage}`;

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
		const lambda = new GuApiLambda(this, `${app}-lambda`, {
			description:
				'A lambda that handles stripe disputes webhook events and processes SQS events',
			functionName: nameWithStage,
			loggingFormat: LoggingFormat.TEXT,
			fileName: `${app}.zip`,
			handler: 'index.handler',
			runtime: nodeVersion,
			memorySize: 1024,
			timeout: Duration.seconds(300),
			environment: commonEnvironmentVariables,
			monitoringConfiguration: {
				noMonitoring: true, // There is a threshold alarm defined below
			},
			app: app,
			api: {
				id: nameWithStage,
				restApiName: nameWithStage,
				description:
					'API Gateway for Stripe dispute webhooks (sync response) with SQS event processing',
				proxy: true,
				deployOptions: {
					stageName: this.stage,
				},
				apiKeySourceType: ApiKeySourceType.HEADER,
				defaultMethodOptions: {
					apiKeyRequired: true,
				},
			},
			events: [
				new SqsEventSource(disputeEventsQueue, {
					batchSize: 1, // Process one dispute event at a time
					maxBatchingWindow: Duration.seconds(0), // Process immediately
				}),
			],
		});

		const usagePlan = lambda.api.addUsagePlan('UsagePlan', {
			name: nameWithStage,
			description: 'REST endpoints for stripe disputes webhook api',
			apiStages: [
				{
					stage: lambda.api.deploymentStage,
					api: lambda.api,
				},
			],
		});

		// create api key
		const apiKey = lambda.api.addApiKey(`${app}-key-${this.stage}`, {
			apiKeyName: `${app}-key-${this.stage}`,
		});

		// associate api key to plan
		usagePlan.addApiKey(apiKey);

		const s3InlinePolicy: Policy = new Policy(this, 'S3 inline policy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['s3:GetObject'],
					resources: [
						`arn:aws:s3::*:membership-dist/${this.stack}/${this.stage}/${app}/`,
					],
				}),
			],
		});

		const secretsManagerPolicy: Policy = new Policy(
			this,
			'Secrets Manager policy',
			{
				statements: [
					new PolicyStatement({
						effect: Effect.ALLOW,
						actions: ['secretsmanager:GetSecretValue'],
						resources: [
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${this.stage}/Zuora-OAuth/SupportServiceLambdas-*`,
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:${this.stage}/Salesforce/ConnectedApp/StripeDisputeWebhooks-*`,
						],
					}),
				],
			},
		);

		const sqsEmailPolicy: Policy = new Policy(this, 'SQS email policy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['sqs:sendmessage'],
					resources: [
						`arn:aws:sqs:${this.region}:${this.account}:braze-emails-${this.stage}`,
					],
				}),
			],
		});

		const sqsDisputeEventsPolicy: Policy = new Policy(
			this,
			'SQS dispute events policy',
			{
				statements: [
					new PolicyStatement({
						effect: Effect.ALLOW,
						actions: ['sqs:SendMessage', 'sqs:GetQueueAttributes'],
						resources: [disputeEventsQueue.queueArn],
					}),
				],
			},
		);

		lambda.role?.attachInlinePolicy(s3InlinePolicy);
		lambda.role?.attachInlinePolicy(secretsManagerPolicy);
		lambda.role?.attachInlinePolicy(sqsEmailPolicy);
		lambda.role?.attachInlinePolicy(sqsDisputeEventsPolicy);

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
			restApiId: lambda.api.restApiId,
			stage: lambda.api.deploymentStage.stageName,
		});

		new CfnRecordSet(this, 'DNSRecord', {
			name: props.domainName,
			type: 'CNAME',
			hostedZoneId: props.hostedZoneId,
			ttl: '120',
			resourceRecords: [cfnDomainName.attrRegionalDomainName],
		});
	}
}
