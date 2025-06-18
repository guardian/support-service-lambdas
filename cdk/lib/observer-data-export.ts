import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack, GuStringParameter } from '@guardian/cdk/lib/constructs/core';
import {
	type GuFunctionProps,
	GuLambdaFunction,
} from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
import { CfnFlow } from 'aws-cdk-lib/aws-appflow';
import {
	ComparisonOperator,
	Metric,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import {
	ArnPrincipal,
	PolicyStatement,
	ServicePrincipal,
	User,
} from 'aws-cdk-lib/aws-iam';
import { LoggingFormat } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Bucket, EventType } from 'aws-cdk-lib/aws-s3';
import { SqsDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { nodeVersion } from './node-version';

export class ObserverDataExport extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'observer-data-export';
		const unifidaPublicRsaKeyFilePath = `Public_keys/unifida_public_rsa_key.pem`;
		const observerNewspaperSubscribersFolder = `Observer_newspaper_subscribers`;

		const sharedBucket = new Bucket(this, 'Bucket', {
			bucketName: `${app}-${this.stage.toLowerCase()}`,
			lifecycleRules: [
				'Observer_newsletter_eligible/',
				'Observer_newsletter_subscribers/',
				'Observer_newspaper_subscribers/',
			].map((prefix) => ({
				expiration: Duration.days(28),
				prefix,
			})),
		});

		const md5FingerprintsBucket = new Bucket(this, 'Md5FingerprintsBucket', {
			bucketName: `${app}-md5-fingerprints-${this.stage.toLowerCase()}`,
		});

		const unifidaUser = new User(this, 'UnifidaUser', {
			userName: `unifida-${this.stage.toLowerCase()}`,
		});

		sharedBucket.grantRead(unifidaUser);

		const airflowCloudComposerUserArnParameter = new GuStringParameter(
			this,
			`${app}-airflow-cloud-composer-user-arn`,
			{
				description: `Airflow cloud composer user ARN (Ophan Account)`,
			},
		);

		sharedBucket.grantReadWrite(
			new ArnPrincipal(airflowCloudComposerUserArnParameter.valueAsString),
			`Observer_newsletter_eligible/*`,
		);

		sharedBucket.grantRead(
			new ArnPrincipal(airflowCloudComposerUserArnParameter.valueAsString),
			unifidaPublicRsaKeyFilePath,
		);

		const salesforceObserverDataTransferBucket = new Bucket(
			this,
			'SalesforceObserverDataTransferBucket',
			{
				bucketName: `salesforce-observer-data-transfer-${this.stage.toLowerCase()}`,
				lifecycleRules: [{ expiration: Duration.days(1) }],
			},
		);

		salesforceObserverDataTransferBucket.grantWrite(
			new ServicePrincipal('appflow.amazonaws.com'),
			'*',
			[
				's3:PutObject',
				's3:AbortMultipartUpload',
				's3:ListMultipartUploadParts',
				's3:ListBucketMultipartUploads',
				's3:GetBucketAcl',
				's3:PutObjectAcl',
			],
		);

		const flow = new CfnFlow(this, 'SalesforceObserverDataTransferFlow', {
			flowName: `salesforce-observer-data-transfer-${this.stage}`,
			flowStatus: 'Active',
			description: `Observer-only data is extracted from Salesforce on a weekly schedule and transferred to a designated S3 bucket in AWS. When a new file is created in this bucket, an S3 event notification sends a message to an SQS queue, which triggers a Lambda function. The function encrypts the file and uploads it to another S3 bucket shared with Tortoise Media.`,
			sourceFlowConfig: {
				connectorType: 'Salesforce',
				connectorProfileName: `salesforce-observer-data-transfer-${this.stage}`,
				sourceConnectorProperties: {
					salesforce: {
						object: 'Observer_Subscriber_Data__c',
					},
				},
			},
			destinationFlowConfigList: [
				{
					connectorType: 'S3',
					destinationConnectorProperties: {
						s3: {
							bucketName: salesforceObserverDataTransferBucket.bucketName,
							s3OutputFormatConfig: {
								fileType: 'CSV',
							},
						},
					},
				},
			],
			tasks: [
				{
					sourceFields,
					connectorOperator: { salesforce: 'PROJECTION' },
					taskType: 'Filter',
				},
				...sourceFields.map((field) => ({
					sourceFields: [field],
					taskType: 'Map',
					destinationField: field.replace(/__c$/, '').toLowerCase(),
					connectorOperator: { salesforce: 'NO_OP' },
				})),
			],
			triggerConfig: {
				triggerType: 'Scheduled',
				triggerProperties: {
					scheduleExpression: 'cron(0 7 ? * TUE *)', // At 07:00 AM UTC every Tuesday
					dataPullMode: 'Complete',
				},
			},
		});

		const lambdaDefaultConfig: Pick<
			GuFunctionProps,
			'app' | 'memorySize' | 'fileName' | 'runtime' | 'timeout' | 'environment'
		> = {
			app,
			memorySize: 1024,
			fileName: `${app}.zip`,
			runtime: nodeVersion,
			timeout: Duration.seconds(300),
		};

		const deadLetterQueue = new Queue(this, `dead-letters-${app}-queue`, {
			queueName: `dead-letters-${app}-queue-${props.stage}`,
			retentionPeriod: Duration.days(1),
		});

		const queue = new Queue(this, `${app}-queue`, {
			queueName: `${app}-queue-${props.stage}`,
			deadLetterQueue: {
				queue: deadLetterQueue,
				maxReceiveCount: 2,
			},
			visibilityTimeout: Duration.seconds(300),
		});

		const lambda = new GuLambdaFunction(
			this,
			'EncryptAndUploadObserverDataLambda',
			{
				...lambdaDefaultConfig,
				environment: {
					Stage: this.stage,
					UnifidaSharedBucketName: sharedBucket.bucketName,
					UnifidaPublicRsaKeyFilePath: unifidaPublicRsaKeyFilePath,
					ObserverNewspaperSubscribersFolder:
						observerNewspaperSubscribersFolder,
					Md5FingerprintsBucketName: md5FingerprintsBucket.bucketName,
				},
				handler: 'encryptAndUploadObserverData.handler',
				functionName: `encrypt-and-upload-observer-data-${this.stage}`,
				loggingFormat: LoggingFormat.TEXT,
				initialPolicy: [
					new PolicyStatement({
						actions: ['s3:GetObject'],
						resources: [
							`${sharedBucket.bucketArn}/${unifidaPublicRsaKeyFilePath}`,
							`${salesforceObserverDataTransferBucket.bucketArn}/*`,
						],
					}),
					new PolicyStatement({
						actions: ['s3:PutObject'],
						resources: [
							`${sharedBucket.bucketArn}/${observerNewspaperSubscribersFolder}/*`,
						],
					}),
					new PolicyStatement({
						actions: ['s3:PutObject'],
						resources: [`${md5FingerprintsBucket.bucketArn}/*`],
					}),
				],
				events: [new SqsEventSource(queue)],
			},
		);

		salesforceObserverDataTransferBucket.addEventNotification(
			EventType.OBJECT_CREATED,
			new SqsDestination(queue),
		);

		new GuAlarm(
			this,
			`encrypt-and-upload-observer-data-${this.stage}-lambda-alarm`,
			{
				app,
				snsTopicName: `alarms-handler-topic-${this.stage}`,
				alarmName: `${this.stage}: Failed to encrypt & upload Observer-only data to S3 bucket shared with Unifida (Tortoise's dev team)`,
				alarmDescription: `Fix: check logs for lambda ${lambda.functionName} and redrive event from dead letter queue ${deadLetterQueue.queueName}.`,
				metric: deadLetterQueue
					.metric('ApproximateNumberOfMessagesVisible')
					.with({ statistic: 'Sum', period: Duration.minutes(1) }),
				comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
				treatMissingData: TreatMissingData.NOT_BREACHING,
				threshold: 0,
				evaluationPeriods: 1,
				datapointsToAlarm: 1,
				actionsEnabled: true,
			},
		);

		new GuAlarm(this, `${flow.flowName}-flow-alarm`, {
			app,
			snsTopicName: `alarms-handler-topic-${this.stage}`,
			alarmName: `${this.stage}: Failed to transfer Observer-only data from Salesforce to AWS (via AppFlow)`,
			alarmDescription: `Debug: view "Run history" in the dashboard for flow ${flow.flowName}. Manual fix: upload today's unencrypted CSV file anywhere inside the ${salesforceObserverDataTransferBucket.bucketName} bucket.`,
			metric: new Metric({
				namespace: 'AWS/AppFlow',
				metricName: 'FlowExecutionsFailed',
				dimensionsMap: {
					FlowName: flow.flowName,
				},
				statistic: 'Sum',
				period: Duration.minutes(1),
			}),
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			treatMissingData: TreatMissingData.NOT_BREACHING,
			threshold: 0,
			evaluationPeriods: 1,
			datapointsToAlarm: 1,
			actionsEnabled: true,
		});
	}
}

const sourceFields = [
	'Subscription_ID__c',
	'Subscriber_ID__c',
	'Status__c',
	'Product__c',
	'Product_Delivery_SKU__c',
	'Frequency__c',
	'Regular_Price__c',
	'Initial_Offer_Price__c',
	'Initial_Offer_Duration_Months__c',
	'In_Life_Discount_Applied_To_Invoice__c',
	'In_Life_Discount_Remaining_Months__c',
	'Acquired_Timestamp__c',
	'First_Delivery_Date__c',
	'Latest_Recorded_Delivery_Date__c',
	'Last_Invoice_Number__c',
	'Last_Invoice_Date__c',
	'Last_Invoice_Net_Amount__c',
	'Last_Payment_Date__c',
	'Last_Payment_Amount__c',
	'Payment_Method__c',
	'Next_Invoice_Date__c',
	'Next_Invoice_Holiday_Credits_Applied__c',
	'Next_Invoice_Preview_Amount__c',
	'Cancellation_Notification_Date__c',
	'Cancellation_Reason__c',
	'Cancellation_Effective_Date__c',
	'Cancellation_Refund_Date__c',
	'Cancellation_Refund_Amount__c',
	'Customer_Account_Created_Timestamp__c',
	'Billing_Title__c',
	'Billing_First_Name__c',
	'Billing_Last_Name__c',
	'Billing_Email_Address__c',
	'Billing_Phone_Number__c',
	'Billing_Street__c',
	'Billing_City__c',
	'Billing_County__c',
	'Billing_Postcode__c',
	'Delivery_Title__c',
	'Delivery_First_Name__c',
	'Delivery_Last_Name__c',
	'Delivery_Street__c',
	'Delivery_City__c',
	'Delivery_County__c',
	'Delivery_Postcode__c',
	'Delivery_Phone_Number__c',
	'Delivery_Instructions__c',
];
