import { GuApiGatewayWithLambdaByPath } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda/lambda';
import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { AwsIntegration } from 'aws-cdk-lib/aws-apigateway';
import {
	Effect,
	Policy,
	PolicyStatement,
	Role,
	ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Queue } from 'aws-cdk-lib/aws-sqs';

export interface TicketTailorWebhookProps extends GuStackProps {
	stack: string;
	stage: string;
}

export class TicketTailorWebhook extends GuStack {
	constructor(scope: App, id: string, props: TicketTailorWebhookProps) {
		super(scope, id, props);

		const app = 'ticket-tailor-webhook';
		const nameWithStage = `${app}-${this.stage}`;

		const alarmsTopic = `alarms-handler-topic-${this.stage}`;

		const commonEnvironmentVariables = {
			App: app,
			Stack: this.stack,
			Stage: this.stage,
		};

		// SQS
		const queueName = `${app}-queue-${props.stage}`;
		const deadLetterQueueName = `${app}-dlq-${props.stage}`;

		const deadLetterQueue = new Queue(this, deadLetterQueueName, {
			queueName: deadLetterQueueName,
			retentionPeriod: Duration.days(14),
		});

		const queue = new Queue(this, queueName, {
			queueName,
			deadLetterQueue: {
				// The number of times a message can be unsuccessfully dequeued before being moved to the dlq
				maxReceiveCount: 1,
				queue: deadLetterQueue,
			},
			// This must be >= the lambda timeout
			visibilityTimeout: Duration.minutes(5),
		});

		// SQS to Lambda event source mapping
		const eventSource = new SqsEventSource(queue, {
			reportBatchItemFailures: true,
		});
		const events = [eventSource];

		// grant sqs:SendMessage* to Api Gateway Role
		const apiRole = new Role(this, 'ApiGatewayToSqsRole', {
			assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
		});
		queue.grantSendMessages(apiRole);

		// API Gateway Direct Integration
		const sendMessageIntegration = new AwsIntegration({
			service: 'sqs',
			path: `${this.account}/${queue.queueName}`,
			integrationHttpMethod: 'POST',
			options: {
				credentialsRole: apiRole,
				requestParameters: {
					'integration.request.header.Content-Type':
						"'application/x-www-form-urlencoded'",
				},
				requestTemplates: {
					'application/json':
						'Action=SendMessage&MessageBody=$input.body&MessageAttribute.1.Name=tickettailor-webhook-signature&MessageAttribute.1.Value.DataType=String&MessageAttribute.1.Value.StringValue=$method.request.header.tickettailor-webhook-signature',
				},
				integrationResponses: [
					{
						statusCode: '200',
						responseTemplates: {
							'application/json': '{ "status": "accepted" }',
						},
					},
				],
			},
		});

		// ---- API-triggered lambda functions ---- //
		const lambda = new GuLambdaFunction(this, `${app}-lambda`, {
			description:
				'An API Gateway triggered lambda generated in the support-service-lambdas repo',
			functionName: nameWithStage,
			fileName: `${app}.zip`,
			handler: 'index.handler',
			runtime: Runtime.NODEJS_18_X,
			memorySize: 1024,
			timeout: Duration.seconds(300),
			environment: commonEnvironmentVariables,
			app: app,
			events,
		});

		const prodMonitoringConfiguration = {
			snsTopicName: alarmsTopic,
			http5xxAlarm: {
				tolerated5xxPercentage: 0,
			},
		};
		const apiGateway = new GuApiGatewayWithLambdaByPath(this, {
			app,
			monitoringConfiguration:
				this.stage === 'CODE'
					? { noMonitoring: true }
					: prodMonitoringConfiguration,
			targets: [],
		});
		apiGateway.api.root
			.resourceForPath('/')
			.addMethod('POST', sendMessageIntegration, {
				methodResponses: [
					{
						statusCode: '200',
					},
				],
			});

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

		const secretManagerAccessPolicy = new Policy(
			this,
			'Secret manager access policy',
			{
				statements: [
					new PolicyStatement({
						actions: ['secretsmanager:GetSecretValue'],
						resources: [
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:PROD/TicketTailor/Webhook-validation-ECS6P8`,
							`arn:aws:secretsmanager:${this.region}:${this.account}:secret:CODE/TicketTailor/Webhook-validation-eEsTGW`,
						],
					}),
				],
			},
		);

		lambda.role?.attachInlinePolicy(s3InlinePolicy);
		lambda.role?.attachInlinePolicy(secretManagerAccessPolicy);
	}
}
