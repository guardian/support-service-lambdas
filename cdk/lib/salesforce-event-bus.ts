import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import { GuLambdaFunction } from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
import { nodeVersion } from './node-version';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { Queue } from 'aws-cdk-lib/aws-sqs';

export class SalesforceEventBus extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'salesforce-event-bus';

		new GuLambdaFunction(this, 'SalesforceEventBusPlaceholder', {
			app,
			memorySize: 1024,
			fileName: `${app}.zip`,
			runtime: nodeVersion,
			timeout: Duration.seconds(300),
			handler: 'salesforceEventBusPlaceholder.handler',
			functionName: `${app}-placeholder-${this.stage}`,
		});

		const salesforceBus = EventBus.fromEventBusArn(
			this,
			'SalesforceBus',
			this.stage === 'PROD'
				? `arn:aws:events:${this.region}::event-source/aws.partner/salesforce.com/00D20000000nq5gEAA/0YLQv00000000zJOAQ`
				: `arn:aws:events:${this.region}::event-source/aws.partner/salesforce.com/00D9E0000004jvhUAA/0YLUD00000008Ll4AI`,
		);

		const deadLetterQueue = new Queue(this, `dead-letters-${app}-queue`, {
			queueName: `dead-letters-${app}-queue-${props.stage}`,
			retentionPeriod: Duration.days(14),
		});
	}
}
