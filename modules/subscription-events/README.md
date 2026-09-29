# subscription-events

Zod schemas and helpers for events published to the `subscription-events-STAGE`
EventBridge bus (see `plan/PLAN-subscription-events-schemas.md` and
`plan/PLAN-spike-document.md` for the background/design).

There's deliberately no barrel `index.ts` re-exporting everything - files are kept
small and cohesive, and are imported directly, e.g.
`import { SubscriptionEventService } from '@modules/subscription-events/producer/subscriptionEventService'`.

Source (and tests) are split into three folders by who needs them:

- `shared/` - the wire format, needed by both producers and consumers. Both sides
  must always agree on this, so it's not owned by either.
- `producer/` - only used by lambdas/services that publish events onto the bus.
- `consumer/` - only used by the lambda(s) that listen to the bus.

## Key files

### `shared/`

- `cancellationEvent.ts` - the `Cancellation` event's `detail` schema, and its full
  envelope schema (built with `@modules/aws/eventBridgeEnvelope`). Each event type
  gets its own file like this one. Uses the branded `SubscriptionNumber`/
  `OrderNumber` types/schemas from `@modules/zuora/identifiers` (Zuora's own naming
  for this field - shared there since it's also used elsewhere as parsed handler
  input, e.g. `handlers/product-switch-api`).
- `subscriptionEventSchema.ts` - composes every event type's schema (e.g.
  `cancellationEvent.ts`) into one `z.discriminatedUnion('detail-type', [...])`
  covering the whole bus. Add new event types here as they're introduced.
- `source.ts` - `subscriptionEventSourceSchema`, the validated enum of known event
  producers (the envelope's `source` field), plus the `<prefix>:<system-name>`
  naming convention used to build a log link back to the source system. Shared
  because a consumer may also want to validate/link back to a known source, not
  just the producer publishing it.

### `producer/`

- `subscriptionEventService.ts` - producer-side `SubscriptionEventService` class: DI an
  `EventBridgeService`, `stage`, and `source` (`SubscriptionEventSource`, from
  `shared/source.ts`) once (e.g. on cold start), then call e.g.
  `publisher.publishCancellationEvent(detail)` per event, wrapping
  `@modules/aws/eventBridgeService`'s `EventBridgeService`.

### `consumer/`

- `eventBridgeSqsHandler.ts` - consumer-side `EventBridgeSQSHandler`, a thin wrapper
  around `@modules/routing/sqsHandler`'s `SQSHandler` for a lambda subscribed to
  this bus via SQS: parses+validates each record's body against
  `subscriptionEventSchema`, then adds a nested logging context keyed on
  `subscriptionNumber` (stacked on top of `SQSHandler`'s own `messageId` context)
  before calling the handler. The actual listener lambda that uses this wrapper
  lives under `handlers/` and is added as a separate step.

## Testing

Run this module's unit tests with `pnpm test` from this directory, or via the
repo-wide `pnpm test` from the root. All tests here are pure unit tests (zod
parsing, and the AWS SDK client mocked via an injectable `send`), no AWS
credentials or integration environment required.

## References

- `plan/PLAN-subscription-events-schemas.md` - full design decisions for this
  module.
- `plan/PLAN-spike-document.md` - the original spike this work implements.
- [AWS EventBridge event structure](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events-structure.html)
