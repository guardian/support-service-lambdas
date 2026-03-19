import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { type App, Duration } from 'aws-cdk-lib';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Queue } from 'aws-cdk-lib/aws-sqs';

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
	}
}
