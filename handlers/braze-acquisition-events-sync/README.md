# braze-acquisition-events-sync

## Overview

An AWS Lambda that listens to acquisition events from an EventBridge event bus and syncs them to Braze as custom events via the [`/users/track`](https://www.braze.com/docs/api/endpoints/user_data/post_user_track/) endpoint.

### Why this lambda exists

Without it, Braze only learns about a new contribution or subscription when `diff-publisher` runs its nightly batch (once a day, overnight). Until that batch completes, Braze still treats the user as a non-supporter and continues to show them marketing surfaces — banners, epics, etc.

This lambda closes that gap: it fires as soon as the acquisition event is published, so Braze is updated within seconds of the purchase and can immediately suppress marketing for that user.

When a user completes a purchase (contribution, subscription, etc.), an `AcquisitionsEvent` is published to the `acquisitions-bus` EventBridge event bus. This lambda picks it up, looks up the user's Braze UUID from the Identity API (IDAPI), transforms the acquisition data into a Braze event payload (the fields are transformed to correspond to existing field values in big Query tables), and posts it to Braze.

Events for **guest users** (no `identityId`) are silently skipped since they cannot be matched to a Braze profile.

### Supported products

| Internal value | Braze event `product_name` |
|---|---|
| `CONTRIBUTION` | Single Contribution |
| `RECURRING_CONTRIBUTION` | Recurring Contribution |
| `SUPPORTER_PLUS` | Supporter Plus |
| `TIER_THREE` | Tier Three |
| `DIGITAL_SUBSCRIPTION` | Digital Subscription |
| `PRINT_SUBSCRIPTION` (Guardian Weekly) | Guardian Weekly - Digital |
| `PRINT_SUBSCRIPTION` (other) | Newspaper - Subscription |
| `APP_PREMIUM_TIER` | Premium App |
| `GUARDIAN_AD_LITE` | Guardian Ad-Lite |
| `FEAST_APP` | Feast App |

## Event flow

```
acquisitions-bus (EventBridge)
        │  AcquisitionsEvent
        ▼
braze-acquisition-events-sync (Lambda)
        │
        ├─ 1. Parse & validate event (zod)
        ├─ 2. Skip if no identityId (guest)
        ├─ 3. Look up Braze UUID via IDAPI (privateFields.brazeUuid)
        ├─ 4. Skip if Braze UUID not found
        ├─ 5. Transform event → Braze /users/track payload
        └─ 6. POST to Braze /users/track
```

If EventBridge cannot invoke the lambda after 3 retries or within 2 hours, the event is sent to a dead-letter queue (DLQ) for manual inspection.

## Infrastructure (CDK)

Defined in [cdk/lib/braze-acquisition-events-sync.ts](../../cdk/lib/braze-acquisition-events-sync.ts).

| Resource | Details |
|---|---|
| Lambda | `SrApiLambda` |
| EventBridge rule | `braze-acquisition-events-sync-{stage}` on `acquisitions-bus-{stage}`, matches `detail-type: AcquisitionsEvent` |
| EventBridge DLQ | `braze-acquisition-events-sync-eventbridge-dlq-{stage}` |
| Lambda error alarm | Fires in PROD when ≥1 lambda error in a 5-minute window |
| DLQ alarm | Fires in PROD when ≥1 message is visible in the DLQ in a 5-minute window |

## URLs

| Stage | URL |
|---|---|
| CODE | https://braze-acquisition-events-sync-code.support.guardianapis.com/ |
| PROD | https://braze-acquisition-events-sync.support.guardianapis.com/ |

## Configuration

Loaded from SSM Parameter Store via `@modules/aws/appConfig`:

| Key | Description |
|---|---|
| `braze.apiUrl` | Braze REST API base URL |
| `braze.apiKey` | Braze REST API key (secret) |

The Identity client access token is read from:
`/{stage}/support/braze-acquisition-events-sync/identity-client-access-token`

## How to test

Run unit tests:

```bash
pnpm --filter braze-acquisition-events-sync test
```

Run integration tests:

```bash
pnpm --filter braze-acquisition-events-sync test:integration
```

Lint the OpenAPI spec:

```bash
pnpm --filter braze-acquisition-events-sync openapi:lint
```

Preview the OpenAPI spec locally:

```bash
pnpm --filter braze-acquisition-events-sync openapi:preview
```

## Alerts and triage

**Lambda error alarm**
Inspect lambda logs for error stack and `identityId` context. Check IDAPI lookup result for missing `brazeUuid`. Confirm Braze `/users/track` request and response payloads. Impact: eligible users may not have acquisition events applied to their Braze profile.

**EventBridge DLQ alarm**
Inspect DLQ message attributes for the invoke failure reason. Confirm the EventBridge rule event pattern matches the `AcquisitionsEvent` payload shape. Verify lambda permissions from EventBridge. Redrive once the root cause is fixed.



