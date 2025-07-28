import { GuApiLambda } from '@guardian/cdk';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import type { App } from 'aws-cdk-lib';
import { Duration, Fn } from 'aws-cdk-lib';
import {
	ApiKeySourceType,
	CfnBasePathMapping,
	CfnDomainName,
} from 'aws-cdk-lib/aws-apigateway';
import { ComparisonOperator, Metric, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { LoggingFormat, Runtime } from 'aws-cdk-lib/aws-lambda';
import { CfnRecordSet } from 'aws-cdk-lib/aws-route53';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { SrLambdaAlarm } from './cdk/sr-lambda-alarm';

export interface ProductMoveApiProps extends GuStackProps {
	stack: string;
	stage: string;
	certificateId: string;
	domainName: string;
	hostedZoneId: string;
}

export class ProductMoveApi extends GuStack {
	constructor(scope: App, id: string, props: ProductMoveApiProps) {
		super(scope, id, props);

		const app = 'product-move-api';
		const nameWithStage = `${app}-${this.stage}`;

		const commonEnvironmentVariables = {
			App: app,
			Stack: this.stack,
			Stage: this.stage,
		};

		const runtime = Runtime.JAVA_21;
		const fileName = `${app}.jar`;
		const memorySize = 6144;
		const timeout = Duration.seconds(300);

		// ---- SQS Queues ---- //
		const refundDeadLetterQueue = new Queue(this, 'RefundDeadLetterQueue', {
			queueName: `product-switch-refund-dead-letter-${this.stage}`,
			retentionPeriod: Duration.days(14),
		});

		const refundQueue = new Queue(this, 'RefundQueue', {
			queueName: `product-switch-refund-${this.stage}`,
			visibilityTimeout: Duration.hours(12),
			retentionPeriod: Duration.seconds(606600), // 7 days + 30 minutes
			deadLetterQueue: {
				queue: refundDeadLetterQueue,
				maxReceiveCount: 14,
			},
		});

		const salesforceTrackingQueue = new Queue(this, 'SalesforceTrackingQueue', {
			queueName: `product-switch-salesforce-tracking-${this.stage}`,
			visibilityTimeout: Duration.seconds(3000),
		});

		// ---- Main API Lambda ---- //
		const lambda = new GuApiLambda(this, `${app}-lambda`, {
			description: 'A lambda for handling product movement API requests',
			functionName: `move-product-${this.stage}`,
			loggingFormat: LoggingFormat.TEXT,
			fileName: fileName,
			handler: 'com.gu.productmove.Handler::handleRequest',
			runtime: runtime,
			memorySize: memorySize,
			timeout: timeout,
			environment: {
				...commonEnvironmentVariables,
				EmailQueueName: Fn.importValue(`comms-${this.stage}-EmailQueueName`),
			},
			// Create an alarm
			monitoringConfiguration: {
				noMonitoring: true,
			},
			app: app,
			api: {
				id: nameWithStage,
				restApiName: `${nameWithStage}-ApiGateway`,
				description: `API Gateway endpoint for the ${nameWithStage} lambda`,
				proxy: true,
				deployOptions: {
					stageName: this.stage,
				},
				apiKeySourceType: ApiKeySourceType.HEADER,
				defaultMethodOptions: {
					apiKeyRequired: true,
				},
			},
		});

		// Add docs endpoint without API key requirement - handled via OpenAPI spec in the proxy configuration

		// ---- Refund Lambda ---- //
		const refundLambda = new GuLambdaFunction(this, 'RefundLambda', {
			app,
			description: 'An SQS-triggered lambda that refunds customer\'s going through product-switching',
			functionName: `product-switch-refund-${this.stage}`,
			loggingFormat: LoggingFormat.TEXT,
			fileName: fileName,
			handler: 'com.gu.productmove.refund.RefundHandler::handleRequest',
			runtime: runtime,
			memorySize: 1024,
			timeout: timeout,
			environment: commonEnvironmentVariables,
			events: [new SqsEventSource(refundQueue, { batchSize: 1 })],
		});

		// ---- Salesforce Tracking Lambda ---- //
		const salesforceTrackingLambda = new GuLambdaFunction(this, 'SalesforceTrackingLambda', {
			app,
			description: 'An SQS-triggered lambda that tracks product switches in Salesforce',
			functionName: `product-switch-salesforce-tracking-${this.stage}`,
			loggingFormat: LoggingFormat.TEXT,
			fileName: fileName,
			handler: 'com.gu.productmove.salesforce.SalesforceHandler::handleRequest',
			runtime: runtime,
			memorySize: 1024,
			timeout: timeout,
			environment: commonEnvironmentVariables,
			events: [new SqsEventSource(salesforceTrackingQueue, { batchSize: 1 })],
		});

		// ---- Usage Plan and API Key ---- //
		const usagePlan = lambda.api.addUsagePlan('UsagePlan', {
			name: `${nameWithStage}-UsagePlan`,
			description: `Usage plan for ${nameWithStage}`,
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

		// ---- IAM Policies ---- //
		// Main API Lambda Policies
		const mainLambdaS3Policy = new Policy(this, 'MainLambdaS3Policy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['s3:GetObject'],
					resources: [
						`arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${this.stage}/invoicingApi-${this.stage}*.json`,
						`arn:aws:s3:::gu-zuora-catalog/${this.stage}/Zuora-${this.stage}/catalog.json`,
						'arn:aws:s3::*:membership-dist/*',
					],
				}),
			],
		});

		const mainLambdaSqsPolicy = new Policy(this, 'MainLambdaSqsPolicy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['sqs:GetQueueUrl', 'sqs:SendMessage'],
					resources: [
						Fn.importValue(`comms-${this.stage}-EmailQueueArn`),
						refundQueue.queueArn,
						salesforceTrackingQueue.queueArn,
					],
				}),
			],
		});

		const mainLambdaDynamoDbPolicy = new Policy(this, 'MainLambdaDynamoDbPolicy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['dynamodb:PutItem', 'dynamodb:UpdateItem'],
					resources: [
						Fn.importValue(`supporter-product-data-tables-${this.stage}-SupporterProductDataTable`),
					],
				}),
			],
		});

		const mainLambdaSecretsPolicy = new Policy(this, 'MainLambdaSecretsPolicy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['secretsmanager:DescribeSecret', 'secretsmanager:GetSecretValue'],
					resources: [
						'arn:aws:secretsmanager:eu-west-1:865473395570:secret:CODE/InvoicingApi-qNhLQS',
						'arn:aws:secretsmanager:eu-west-1:865473395570:secret:PROD/InvoicingApi-JBxYpW',
						'arn:aws:secretsmanager:eu-west-1:865473395570:secret:CODE/Zuora/User/ZuoraApiUser-zmOGho',
						'arn:aws:secretsmanager:eu-west-1:865473395570:secret:PROD/Zuora/User/ZuoraApiUser-oq5ISm',
					],
				}),
			],
		});

		// Refund Lambda Policies
		const refundLambdaS3Policy = new Policy(this, 'RefundLambdaS3Policy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['s3:GetObject'],
					resources: [
						`arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${this.stage}/zuoraRest-${this.stage}*.json`,
						`arn:aws:s3:::gu-reader-revenue-private/membership/support-service-lambdas/${this.stage}/invoicingApi-${this.stage}*.json`,
						'arn:aws:s3::*:membership-dist/*',
					],
				}),
			],
		});

		const refundLambdaSqsPolicy = new Policy(this, 'RefundLambdaSqsPolicy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['sqs:DeleteMessage', 'sqs:GetQueueAttributes', 'sqs:ReceiveMessage'],
					resources: ['*'],
				}),
			],
		});

		const refundLambdaSecretsPolicy = new Policy(this, 'RefundLambdaSecretsPolicy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['secretsmanager:DescribeSecret', 'secretsmanager:GetSecretValue'],
					resources: [
						'arn:aws:secretsmanager:eu-west-1:865473395570:secret:CODE/InvoicingApi-qNhLQS',
						'arn:aws:secretsmanager:eu-west-1:865473395570:secret:PROD/InvoicingApi-JBxYpW',
						'arn:aws:secretsmanager:eu-west-1:865473395570:secret:CODE/Zuora/User/ZuoraApiUser-zmOGho',
						'arn:aws:secretsmanager:eu-west-1:865473395570:secret:PROD/Zuora/User/ZuoraApiUser-oq5ISm',
					],
				}),
			],
		});

		// Salesforce Tracking Lambda Policies
		const salesforceTrackingLambdaS3Policy = new Policy(this, 'SalesforceTrackingLambdaS3Policy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['s3:GetObject'],
					resources: ['arn:aws:s3::*:membership-dist/*'],
				}),
			],
		});

		const salesforceTrackingLambdaSqsPolicy = new Policy(this, 'SalesforceTrackingLambdaSqsPolicy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['sqs:DeleteMessage', 'sqs:GetQueueAttributes', 'sqs:ReceiveMessage'],
					resources: ['*'],
				}),
			],
		});

		const salesforceTrackingLambdaSecretsPolicy = new Policy(this, 'SalesforceTrackingLambdaSecretsPolicy', {
			statements: [
				new PolicyStatement({
					effect: Effect.ALLOW,
					actions: ['secretsmanager:DescribeSecret', 'secretsmanager:GetSecretValue'],
					resources: [
						'arn:aws:secretsmanager:eu-west-1:865473395570:secret:CODE/Salesforce/User/SupportServiceLambdas-729iA5',
						'arn:aws:secretsmanager:eu-west-1:865473395570:secret:PROD/Salesforce/User/SupportServiceLambdas-417yMt',
						'arn:aws:secretsmanager:eu-west-1:865473395570:secret:CODE/Zuora/User/ZuoraApiUser-zmOGho',
						'arn:aws:secretsmanager:eu-west-1:865473395570:secret:PROD/Zuora/User/ZuoraApiUser-oq5ISm',
					],
				}),
			],
		});

		// Attach policies to lambda roles
		lambda.role?.attachInlinePolicy(mainLambdaS3Policy);
		lambda.role?.attachInlinePolicy(mainLambdaSqsPolicy);
		lambda.role?.attachInlinePolicy(mainLambdaDynamoDbPolicy);
		lambda.role?.attachInlinePolicy(mainLambdaSecretsPolicy);

		refundLambda.role?.attachInlinePolicy(refundLambdaS3Policy);
		refundLambda.role?.attachInlinePolicy(refundLambdaSqsPolicy);
		refundLambda.role?.attachInlinePolicy(refundLambdaSecretsPolicy);

		salesforceTrackingLambda.role?.attachInlinePolicy(salesforceTrackingLambdaS3Policy);
		salesforceTrackingLambda.role?.attachInlinePolicy(salesforceTrackingLambdaSqsPolicy);
		salesforceTrackingLambda.role?.attachInlinePolicy(salesforceTrackingLambdaSecretsPolicy);

		// ---- CloudWatch Alarms ---- //
		if (this.stage === 'PROD') {
			// Product Movement Failure Alarm
			new SrLambdaAlarm(this, 'ProductMovementFailureAlarm', {
				app,
				alarmName: `${this.stage} An error in the Product Move lambda. Please check the logs to diagnose`,
				alarmDescription: 'Impact - Product move lambda failed, please check the logs to diagnose the issue.',
				comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				metric: new Metric({
					metricName: 'Errors',
					namespace: 'AWS/Lambda',
					statistic: 'Sum',
					period: Duration.seconds(300),
					dimensionsMap: {
						FunctionName: lambda.functionName,
					},
				}),
				threshold: 1,
				evaluationPeriods: 1,
				treatMissingData: TreatMissingData.NOT_BREACHING,
				lambdaFunctionNames: lambda.functionName,
			});

			// API Gateway 5XX Alarm
			new SrLambdaAlarm(this, '5xxApiAlarm', {
				app,
				alarmName: `${this.stage} The product-move-api returned a 500 response`,
				alarmDescription: 'Check the logs for details',
				comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				metric: new Metric({
					metricName: '5XXError',
					namespace: 'AWS/ApiGateway',
					statistic: 'Sum',
					period: Duration.seconds(60),
					dimensionsMap: {
						ApiName: `${nameWithStage}-ApiGateway`,
						Stage: this.stage,
					},
				}),
				threshold: 1,
				evaluationPeriods: 1,
				treatMissingData: TreatMissingData.NOT_BREACHING,
				lambdaFunctionNames: lambda.functionName,
			});

			// Salesforce Tracking Lambda Errors Alarm
			new SrLambdaAlarm(this, 'SalesforceTrackingLambdaErrorsAlarm', {
				app,
				alarmName: `${this.stage} Salesforce tracking of a product switch has failed`,
				alarmDescription: 'Impact - tracking of product switches is not going to salesforce/bigquery/braze',
				comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
				metric: new Metric({
					metricName: 'Errors',
					namespace: 'AWS/Lambda',
					statistic: 'Sum',
					period: Duration.seconds(60),
					dimensionsMap: {
						FunctionName: salesforceTrackingLambda.functionName,
					},
				}),
				threshold: 1,
				evaluationPeriods: 1,
				treatMissingData: TreatMissingData.NOT_BREACHING,
				lambdaFunctionNames: salesforceTrackingLambda.functionName,
			});

			// No Salesforce Tracking Alarm
			new SrLambdaAlarm(this, 'NoSalesforceTrackingAlarm', {
				app,
				alarmName: `${this.stage} No Salesforce tracking of a product switch has been queued for 8 hours`,
				alarmDescription: 'Impact - tracking of product switches may not be going to salesforce/bigquery/braze',
				comparisonOperator: ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
				metric: new Metric({
					metricName: 'Invocations',
					namespace: 'AWS/Lambda',
					statistic: 'Sum',
					period: Duration.seconds(28800), // 8 hours
					dimensionsMap: {
						FunctionName: salesforceTrackingLambda.functionName,
					},
				}),
				threshold: 0,
				evaluationPeriods: 1,
				treatMissingData: TreatMissingData.BREACHING,
				lambdaFunctionNames: salesforceTrackingLambda.functionName,
			});

			// Refund Dead Letter Queue Alarm
			new SrLambdaAlarm(this, 'RefundLambdaDeadLetterQueueAlarm', {
				app,
				alarmName: `New message in the product-switch-refund-dead-letter-${this.stage} dead letter queue.`,
				alarmDescription: `There is a new message in the product-switch-refund-dead-letter-${this.stage} dead letter queue. This means that a user who has cancelled their supporter plus subscription within 14 days has not received the refund that they are due. Please check the product-switch-refund-${this.stage} logs and the invoicing-api-refund-${this.stage} logs to diagnose the issue.`,
				comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
				metric: refundDeadLetterQueue.metricApproximateNumberOfMessagesVisible({
					statistic: 'Sum',
					period: Duration.seconds(60),
				}),
				threshold: 0,
				evaluationPeriods: 1,
				treatMissingData: TreatMissingData.NOT_BREACHING,
				lambdaFunctionNames: refundLambda.functionName,
			});
		}
	}
}
