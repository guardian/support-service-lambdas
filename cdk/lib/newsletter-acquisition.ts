import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
	AttributeType,
	BillingMode,
	StreamViewType,
	Table,
	TableEncryption,
} from 'aws-cdk-lib/aws-dynamodb';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { nodeVersion } from './node-version';

export interface NewsletterAcquisitionProps extends GuStackProps {
	identitySnsTopicArn: string;
}

export class NewsletterAcquisition extends GuStack {
	constructor(scope: App, id: string, props: NewsletterAcquisitionProps) {
		super(scope, id, props);

		const app = 'newsletter-acquisition';

		const dlq = new Queue(this, 'DeadLetterQueue', {
			queueName: `${app}-dlq-${this.stage}`,
			retentionPeriod: Duration.days(14),
		});

		const queue = new Queue(this, 'Queue', {
			queueName: `${app}-queue-${this.stage}`,
			retentionPeriod: Duration.days(14),
			visibilityTimeout: Duration.seconds(60),
			deadLetterQueue: {
				queue: dlq,
				maxReceiveCount: 3,
			},
		});

		const snsTopic = Topic.fromTopicArn(
			this,
			'IdentityNewsletterTopic',
			props.identitySnsTopicArn,
		);

		snsTopic.addSubscription(
			new SqsSubscription(queue, { rawMessageDelivery: true }),
		);

		const table = new Table(this, 'AcquisitionsTable', {
			tableName: `${app}-${this.stage}`,
			billingMode: BillingMode.PAY_PER_REQUEST,
			partitionKey: { name: 'userId', type: AttributeType.STRING },
			sortKey: { name: 'sortKey', type: AttributeType.STRING },
			encryption: TableEncryption.AWS_MANAGED,
			stream: StreamViewType.NEW_IMAGE,
			removalPolicy:
				this.stage === 'PROD' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
		});

		const lambda = new GuLambdaFunction(this, 'Lambda', {
			app,
			functionName: `${app}-${this.stage}`,
			fileName: `${app}.zip`,
			handler: 'index.handler',
			runtime: nodeVersion,
			memorySize: 512,
			timeout: Duration.seconds(30),
			environment: {
				NODE_OPTIONS: '--enable-source-maps',
				TABLE_NAME: table.tableName,
			},
		});

		lambda.addEventSource(new SqsEventSource(queue, { batchSize: 1 }));

		table.grantWriteData(lambda);
	}
}
