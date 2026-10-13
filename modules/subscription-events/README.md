# Subscription Events bus module

Library code to publish and consume events on per-event-family EventBridge buses
(starting with the `cancellations-bus-STAGE` bus for `Cancellation` events - a
future event family, e.g. product switches, would get its own bus/schemas
alongside these, sharing the same plumbing).

Currently just supports `Cancellation` events, on the `cancellations-bus-STAGE`
bus. This is to support the initial use case to allow secondary multiple-accounts
users can be notified.

- CODE bus: https://eu-west-1.console.aws.amazon.com/events/home?region=eu-west-1#/eventbus/cancellations-bus-CODE

- PROD bus: https://eu-west-1.console.aws.amazon.com/events/home?region=eu-west-1#/eventbus/cancellations-bus-PROD

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
`AllowPutSubscriptionEventPolicy` (see `cdk/lib/cdk/policies.ts`), passing
`'cancellations-bus'` as the bus.

## Consuming events

A lambda consumes events via SQS: an EventBridge rule on the bus forwards
matching events to an SQS queue, which the lambda is subscribed to.
`CancellationEventSQSHandler` calls your handler with a parsed `Cancellation` event.

```ts
import { CancellationEventSQSHandler } from '@modules/subscription-events/consumer/cancellationEventSqsHandler';

export const handler = CancellationEventSQSHandler(
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

Each bus only ever carries one event type - a new bus is created for each new
event type, rather than routing multiple event types through one bus via
`detail-type` - so the EventBridge rule forwards everything on the bus to the
queue, unfiltered. (See `PLAN-cancellation-bus-rename.md` for the
isolation/swimlaning trade-offs behind this choice.)

Use `SrEventBusLambda` (`cdk/lib/cdk/SrEventBusLambda.ts`) to provision the
queue, DLQ, alarm (same as `SrSqsLambda`, which it wraps), *and* the
EventBridge rule routing a bus to that queue, in one step:

```ts
import { SrEventBusLambda } from './cdk/SrEventBusLambda';

const lambda = new SrEventBusLambda(this, 'CancellationEventsLambda', {
	bus: 'cancellations-bus',
	monitoring: { errorImpact: '...' },
	maxReceiveCount: 3,
	// ...lambdaOverrides, visibilityTimeout etc.
});
```

See `cdk/lib/cdk/SrEventBusLambda.ts` for the implementation.

## References

- [AWS EventBridge event structure](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events-structure.html)
