# mparticle-acquisitions-publisher

## Overview

This Lambda consumes the existing `AcquisitionsEvent` stream and sends paid-media acquisition data to mParticle in near real time. It is an independent EventBridge consumer: acquisition creation, BigQuery publishing, Braze acquisition syncing, and other consumers remain unchanged.

## Event flow

```text
acquisitions-bus-{stage}
        |
        | AcquisitionsEvent rule
        v
mparticle-acquisitions-publisher-queue-{stage}
        |
        | partial batch response
        v
mparticle-acquisitions-publisher-{stage}
        |
        v
mParticle Events API (EU1)
```

Each valid acquisition becomes one mParticle `commerce_event` purchase containing the product, currency, amount when present, transaction ID, acquisition custom attributes, identities, browser context, and paid-media flags.

The queue has a stage-specific DLQ. Malformed records and failed mParticle requests are returned as SQS partial batch failures, so successful records in the same invocation are acknowledged.

## Configuration

The publisher-specific configuration is loaded from encrypted SSM using the standard AppConfig path:

`/{stage}/support/mparticle-acquisitions-publisher`

| Parameter                                               | Purpose                                       |
| ------------------------------------------------------- | --------------------------------------------- |
| `mparticle/googleEnhancedConversionsConversionActionId` | Google Enhanced Conversions action ID         |
| `mparticle/key`                                         | Publisher's mParticle API key                 |
| `mparticle/secret`                                      | Publisher's mParticle API secret              |
| `mparticle/pod`                                         | mParticle pod hosting the publisher workspace |

The publisher's mParticle configuration is isolated from the existing `mparticle-api` handler and is read from the path above for each stage. Store `key` and `secret` as encrypted SSM parameters.

Populate the publisher-specific CODE and PROD values before enabling the corresponding deployment. Never commit or log the credentials.

## Infrastructure

Infrastructure is defined in `cdk/lib/mparticle-acquisitions-publisher.ts` and registered for both stages in `cdk/bin/cdk.ts`.

- EventBridge rule on the existing acquisitions bus.
- EventBridge delivery DLQ.
- Dedicated SQS queue and SQS DLQ.
- SrCDK Lambda with SQS partial batch responses.
- Lambda and DLQ alarms, enabled in PROD.

## Testing

```bash
pnpm --filter mparticle-acquisitions-publisher test
pnpm --filter mparticle-acquisitions-publisher type-check
pnpm --filter mparticle-acquisitions-publisher lint
pnpm --filter mparticle-acquisitions-publisher packageQuick
pnpm --filter cdk package mparticle-acquisitions-publisher
```

## External documentation

- [mParticle Events API](https://docs.mparticle.com/developers/apis/http/)
- [mParticle Google Ads event integration](https://docs.mparticle.com/integrations/google-ads/event/)
- [mParticle Facebook event integration](https://docs.mparticle.com/integrations/facebook/event/)

## Operational recovery

If the mParticle API is unavailable, records remain in SQS retry processing and eventually move to the stage DLQ. After the cause is corrected, inspect the failure classification and redrive the DLQ messages. The handler logs only message/source IDs, counts, endpoint status, and safe failure classifications; it does not log acquisition or mParticle payloads.
