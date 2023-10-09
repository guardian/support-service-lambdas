import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { SqsQueue } from 'aws-cdk-lib/aws-events-targets';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Queue } from 'aws-cdk-lib/aws-sqs';

export const APP_NAME = 'single-contribution-salesforce-writes';

export class SingleContributionSalesforceWrites extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const deadLetterQueue = new Queue(this, `dead-letters-${APP_NAME}-queue`, {
			queueName: `dead-letters-${APP_NAME}-queue-${props.stage}`,
		});

		const queue = new Queue(this, `${APP_NAME}-queue`, {
			queueName: `${APP_NAME}-queue-${props.stage}`,
			deadLetterQueue: {
				queue: deadLetterQueue,
				maxReceiveCount: 3,
			},
		});

		enum AcquisitionBusSource {
			PaymentApi = '{"prefix": "payment-api"}',
		}

		const acquisitionBusName = `acquisitions-bus-${props.stage}`;

		const acquisitionBus = EventBus.fromEventBusArn(
			this,
			'AcquisitionBus',
			`arn:aws:events:${this.region}:${this.account}:event-bus/${acquisitionBusName}`,
		);

		const rule = new Rule(
			this,
			'AcquisitionBusToSingleContributionSalesforceWritesQueueRule',
			{
				description:
					'Send payment api events to the single-contribution-salesforce-writes-queue',
				eventPattern: {
					region: [this.region],
					account: [this.account],
					source: [AcquisitionBusSource.PaymentApi],
				},
				eventBus: acquisitionBus,
				targets: [new SqsQueue(queue)],
			},
		);

		const policyStatement = new PolicyStatement({
			sid: 'Allow acquisition bus to send messages to the single-contribution-salesforce-writes-queue',
			principals: [new ServicePrincipal('events.amazonaws.com')],
			effect: Effect.ALLOW,
			resources: [queue.queueArn],
			actions: ['sqs:SendMessage'],
			conditions: {
				ArnEquals: {
					'aws:SourceArn': rule.ruleArn,
				},
			},
		});

		queue.addToResourcePolicy(policyStatement);
	}
}
