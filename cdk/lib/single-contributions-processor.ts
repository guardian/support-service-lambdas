import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { CfnOutput } from 'aws-cdk-lib';
import type { App } from 'aws-cdk-lib';
import { Queue, QueueEncryption } from 'aws-cdk-lib/aws-sqs';

export const APP_NAME = 'single-contributions-processor';

export class SingleContributionsProcessor extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const deadLetterQueue = new Queue(this, `dead-letters-${APP_NAME}-queue`, {
			queueName: `dead-letters-${APP_NAME}-queue-${props.stage}`,
			encryption: QueueEncryption.SQS_MANAGED,
		});

		new Queue(this, `${APP_NAME}-queue`, {
			queueName: `${APP_NAME}-queue-${props.stage}`,
			encryption: QueueEncryption.SQS_MANAGED,
			deadLetterQueue: {
				queue: deadLetterQueue,
				maxReceiveCount: 3,
			},
		});
	}
}
