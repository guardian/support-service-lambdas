# Subscription Events bus module

Library code to publish and consume events on the `subscription-events-STAGE` EventBridge bus.

Currently just supports `Cancellation` events. This is to support the initial use case
to allow secondary multiple-accounts users can be notified.

- CODE bus: https://eu-west-1.console.aws.amazon.com/events/home?region=eu-west-1#/eventbus/subscription-events-CODE

- PROD bus: https://eu-west-1.console.aws.amazon.com/events/home?region=eu-west-1#/eventbus/subscription-events-PROD

## Data format

The bus processes JSON as per the following example.

The top level properties are a standard EventBridge envelope.

`version`/`id`/`time`/`account`/`region`/`resources` are
filled in automatically by EventBridge itself, not by the publisher.

```json
{
	"version": "0",
	"id": "...",
	"detail-type": "Cancellation", // currently only Cancellation is supported
	"source": "lambda:your-lambda-name-here", // this helps us access the source logs, similar to alarm tags
	"account": "...",
	"time": "2026-01-01T00:00:00Z",
	"region": "eu-west-1",
	"resources": [],
	"detail": { // the schema of the detail is based on the detail-type.
		"subscriptionNumber": "A-S00001234",
		"orderNumber": "O-00005678",
		"allowUserNotifications": true
	}
}
```

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

You will likely need to add a new source identifier to
`shared/source.ts`'s `subscriptionEventSources`, and grant it bus access with
`AllowPutSubscriptionEventPolicy` (see `cdk/lib/cdk/policies.ts`).

## Consuming events

A lambda consumes events via SQS: an EventBridge rule on the bus forwards
matching events to an SQS queue, which the lambda is subscribed to.
`EventBridgeSQSHandler` calls your handler with a parsed `Cancellation` event.

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
DLQ.** There's no automatic link between the CDK construct below and the zod
schema in this module - `SubscriptionEventDetailType` is hardcoded locally in
the construct, so if you add a new event type to the bus, update both by hand.

Use `SrSubscriptionEventsLambda` (`cdk/lib/cdk/SrSubscriptionEventsLambda.ts`)
to provision the queue, DLQ, alarm (same as `SrSqsLambda`, which it wraps),
*and* the EventBridge rule routing the bus to that queue, in one step:

```ts
import { SrSubscriptionEventsLambda } from './cdk/SrSubscriptionEventsLambda';

const lambda = new SrSubscriptionEventsLambda(this, 'CancellationEventsLambda', {
	detailTypes: ['Cancellation'],
	monitoring: { errorImpact: '...' },
	maxReceiveCount: 3,
	// ...lambdaOverrides, visibilityTimeout etc.
});
```

See `cdk/lib/cdk/SrSubscriptionEventsLambda.ts` for the implementation.

## References

- [AWS EventBridge event structure](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events-structure.html)
