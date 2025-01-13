import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import {
	type GuFunctionProps,
	GuLambdaFunction,
} from '@guardian/cdk/lib/constructs/lambda';
import { type App, Duration } from 'aws-cdk-lib';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { SqsQueue } from 'aws-cdk-lib/aws-events-targets';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { nodeVersion } from './node-version';

export class StripeCheckoutSpike extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const app = 'stripe-checkout-spike';

		const stripeBus = EventBus.fromEventBusArn(
			this,
			'StripeBus',
			`arn:aws:events:${this.region}::event-source/aws.partner/stripe.com/ed_test_61RqARF6hmlRU6YCC16Rq9XTM0E9VxCGACIr7p1tg5ZY`,
		);

		const deadLetterQueue = new Queue(this, `dead-letters-${app}-queue`, {
			queueName: `dead-letters-${app}-queue-${props.stage}`,
			retentionPeriod: Duration.days(14),
		});

		const queue = new Queue(this, `${app}-queue`, {
			queueName: `${app}-queue-${props.stage}`,
			deadLetterQueue: {
				queue: deadLetterQueue,
				maxReceiveCount: 1,
			},
		});

		const rule = new Rule(this, 'StripeBusToQueueRule', {
			description: 'Send stripe events to queue',
			eventPattern: {
				region: [this.region],
				account: [this.account],
			},
			eventBus: stripeBus,
			targets: [new SqsQueue(queue)],
		});

		const sendMessagePolicyStatement = new PolicyStatement({
			sid: `Allow stripe bus to send messages to the ${app}-queue`,
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

		queue.addToResourcePolicy(sendMessagePolicyStatement);

		const lambdaDefaultConfig: Pick<
			GuFunctionProps,
			'app' | 'memorySize' | 'fileName' | 'runtime' | 'timeout' | 'environment'
		> = {
			app,
			memorySize: 1024,
			runtime: nodeVersion,
			fileName: `${app}.zip`,
			timeout: Duration.seconds(300),
			environment: { APP: app, STACK: this.stack, STAGE: this.stage },
		};

		new GuLambdaFunction(this, 'CheckoutSessionCompletedHandler', {
			...lambdaDefaultConfig,
			handler: 'checkoutSessionCompletedHandler.handler',
			functionName: `checkout-session-completed-handler-${this.stage}`,
			environment: { ...lambdaDefaultConfig.environment },
			events: [new SqsEventSource(queue)],
		});
	}
}
