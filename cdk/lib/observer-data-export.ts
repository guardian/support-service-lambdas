import { GuAlarm } from '@guardian/cdk/lib/constructs/cloudwatch';
import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack, GuStringParameter } from '@guardian/cdk/lib/constructs/core';
import {
	type GuFunctionProps,
	GuLambdaFunction,
} from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
import { CfnFlow } from 'aws-cdk-lib/aws-appflow';
import { ComparisonOperator } from 'aws-cdk-lib/aws-cloudwatch';
import {
	ArnPrincipal,
	PolicyStatement,
	ServicePrincipal,
	User,
} from 'aws-cdk-lib/aws-iam';
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
			lifecycleRules: [{ expiration: Duration.days(28) }],
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

		new CfnFlow(this, 'SalesforceObserverDataTransferFlow', {
			flowName: `${app}-${this.stage.toLowerCase()}`,
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
					sourceFields: [],
					taskType: 'Map_all',
					connectorOperator: {
						salesforce: 'NO_OP',
					},
				},
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
			environment: {
				Stage: this.stage,
				UnifidaSharedBucketName: sharedBucket.bucketName,
				UnifidaPublicRsaKeyFilePath: unifidaPublicRsaKeyFilePath,
				ObserverNewspaperSubscribersFolder: observerNewspaperSubscribersFolder,
			},
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
				handler: 'encryptAndUploadObserverData.handler',
				functionName: `encrypt-and-upload-observer-data-${this.stage}`,
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
				],
				events: [new SqsEventSource(queue)],
			},
		);

		salesforceObserverDataTransferBucket.addEventNotification(
			EventType.OBJECT_CREATED,
			new SqsDestination(queue),
		);

		new GuAlarm(this, `${app}-alarm`, {
			app: app,
			snsTopicName: `alarms-handler-topic-${this.stage}`,
			alarmName: `${this.stage}: Failed to encrypt & upload Observer-only data to S3 bucket shared with Unifida (Tortoise's dev team)`,
			alarmDescription: `Fix: check logs for lambda ${lambda.functionName} and redrive from dead letter queue ${deadLetterQueue.queueName}`,
			metric: deadLetterQueue
				.metric('ApproximateNumberOfMessagesVisible')
				.with({ statistic: 'Sum', period: Duration.minutes(1) }),
			comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
			threshold: 0,
			evaluationPeriods: 1,
			datapointsToAlarm: 1,
			actionsEnabled: true,
		});
	}
}
