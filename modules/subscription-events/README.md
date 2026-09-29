# subscription-events

Publish and consume events on the `subscription-events-STAGE` EventBridge bus -
currently just `Cancellation` events, published whenever a subscription is
cancelled, so that secondary multiple-accounts users can be notified.

## Publishing an event

```ts
import { EventBridgeService } from '@modules/aws/eventBridgeService';
import { SubscriptionEventService } from '@modules/subscription-events/producer/subscriptionEventService';

// once, on cold start
const subscriptionEventService = new SubscriptionEventService(
	EventBridgeService.create(),
	stage, // 'CODE' | 'PROD'
	'lambda:your-lambda-name-here', // this value appears on the bus to help with debugging
);

// per cancellation
await subscriptionEventService.publishCancellationEvent({
	subscriptionNumber: 'A-S00001234',
	orderNumber: 'O-00005678',
	allowUserNotifications: true, // set to false if it's e.g. a CSR doing a cancel and rebook
});
```

Adding a new producer? Add its source identifier to
`shared/source.ts`'s `subscriptionEventSources`, and grant it bus access with
`AllowPutSubscriptionEventPolicy` (see `cdk/lib/cdk/policies.ts`).

## Consuming events

A lambda consumes events via SQS: an EventBridge rule on the bus forwards
matching events to an SQS queue, which the lambda is subscribed to.
`EventBridgeSQSHandler` wraps `@modules/routing`'s `SQSHandler` to parse each
SQS record's body as a `Cancellation` event before calling your handler:

```ts
import { EventBridgeSQSHandler } from '@modules/subscription-events/consumer/eventBridgeSqsHandler';

export const handler = EventBridgeSQSHandler(
	configSchema,
	async (event, services) => {
		// event is a validated CancellationEvent
		const { subscriptionNumber, orderNumber, allowUserNotifications } =
			event.detail;
		// ... look up secondary users, queue emails, etc.
	},
	buildServices,
);
```

### CDK: routing bus events to the queue

**Only `Cancellation` events are currently parsed by the handler above - the
EventBridge rule feeding the queue must filter to the same detail-type(s), or
any other event later added to the bus will fail to parse and end up in a
DLQ.** There's no automatic link between the CDK rule below and the zod schema
in this module - if you add a new event type to the bus, update both by hand.

Use `SrSqsLambda` (not a hand-rolled `Queue`) - it provisions the queue, DLQ and
alarm together, following SR standards, and exposes the queue to attach the rule
to via `lambda.inputQueue`:

```ts
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { SqsQueue } from 'aws-cdk-lib/aws-events-targets';
import { SrSqsLambda } from './cdk/SrSqsLambda';

const lambda = new SrSqsLambda(this, 'Lambda', {
	monitoring: { errorImpact: '...' },
	maxReceiveCount: 3,
	// ...lambdaOverrides, visibilityTimeout etc.
});

const bus = EventBus.fromEventBusArn(
	this,
	'SubscriptionEventsBus',
	`arn:aws:events:${this.region}:${this.account}:event-bus/subscription-events-${this.stage}`,
);

const rule = new Rule(this, 'CancellationToQueueRule', {
	eventBus: bus,
	eventPattern: {
		detailType: ['Cancellation'], // keep in step with this module's schema(s)
	},
});

rule.addTarget(new SqsQueue(lambda.inputQueue));
```

See `cdk/lib/mobile-purchases-to-supporter-product-data.ts` for a full worked
example of this same bus-rule-to-`SrSqsLambda`-queue pattern.

## References

- [AWS EventBridge event structure](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events-structure.html)
