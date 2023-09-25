import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { CfnOutput } from 'aws-cdk-lib';
import type { App } from 'aws-cdk-lib';
import { Queue } from 'aws-cdk-lib/aws-sqs';

export const APP_NAME = 'single-contribution-record';

export class SingleContributionRecordStack extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		// Resources
		const deadLetterQueue = new Queue(this, `dead-letters-${APP_NAME}-queue`, {
			queueName: `dead-letters-${APP_NAME}-queue-${props.stage}`,
		});

		const queue = new Queue(this, `${APP_NAME}-queue`, {
			queueName: `${APP_NAME}-queue-${props.stage}`,
			deadLetterQueue: {
				queue: deadLetterQueue,
				maxReceiveCount: 2,
			},
		});

		// Outputs
		new CfnOutput(this, `${APP_NAME}-queue-url`, {
			value: deadLetterQueue.queueUrl,
		});

		new CfnOutput(this, `${APP_NAME}-dlq-url`, {
			value: queue.queueUrl,
		});
	}
}
