# scrub-non-tokenised-payment-methods

This handler is a state machine that runs daily to clear non-tokenised card data
from Zuora accounts that are done being billed: every subscription cancelled and
out of term.

## Why

A `CreditCard` payment method in Zuora holds the card details themselves. A
`CreditCardReferenceTransaction` holds only a gateway token, and the card lives
at Stripe or PayPal instead. We have roughly 39,000 `CreditCard` payment methods
against 2.78 million `CreditCardReferenceTransaction` ones.

Keeping card details we can no longer use is what creates the risk: charging
someone we shouldn't, which has happened more than once before; starting a new
subscription against old or defunct card details; and, worst case, those details
being part of a breach.

### This is an ongoing mechanism, not a one off

`CreditCard` are added when details are entered directly into Zuora, which
supports CSR assisted card updates.
Once established, this job will clean up the details as they become redundant,
but before that there is a backlog, which the daily cap clears over about six
weeks. All the counts below were measured against the BigQuery mirror in early
August 2026 and will have moved since.

## Scrub, not delete

We use Zuora's scrub endpoint rather than deleting the payment method. Scrubbing
strips the card data but leaves the payment records that reference it intact, so
the audit trail of which payment was taken with which method survives.

That was the reason for choosing it, and testing in CODE turned up two more:

**Scrub works on a default payment method. Delete does not.** Around 11,000 of
the targets are the default on their account, and Zuora rejects a delete on
those with `50000030 Cannot delete default payment method`. Getting around that
means clearing the default through `PUT /v1/accounts/{n}`, which also forces
`autoPay` to false. Scrubbing needs none of that.

Better still, Zuora tidies the account up on its own. Scrubbing a default
payment method clears `defaultPaymentMethodId` and, where `autoPay` was on,
turns it off. So the account is never left with auto pay enabled and nothing to
charge, and we never write to it. That matters for the largest group of targets:
9,008 of them are the default on an account with `autoPay` still true.

**Scrub works on a cancelled account. Delete does not.** Where the Zuora account
itself has status `Canceled`, both of these are rejected:

```
DELETE /v1/payment-methods/{id}   -> 50000030 Cannot delete payment method on a canceled account
PUT    /v1/accounts/{number}      -> 51500030 Cannot update a cancelled account
```

There is no way through: you cannot delete it and you cannot detach it either.
Only 5 of the current targets are in that state, the other 19,594 sit on
accounts that are still `Active` with all their subscriptions cancelled, but
scrub covers both without a special case.

What scrub does not do is keep the payment method readable. Afterwards
`GET /v1/payment-methods/{id}` answers `50000040 cannot be found` and the object
disappears from ZOQL queries. The payment records survive and still carry the
payment method id. Scrubbing twice fails with `50000020`.

## What counts as a target

- The payment method type is `CreditCard`, so not tokenised.
- Its status is `Active`.
- Every latest-version subscription on the account is `Cancelled`.
- Every one of those has a `termEndDate` in the past.
- The account has at least one subscription, so accounts that never had one are
  left alone.
- The account balance is zero, in either direction.

Cancelled is not the same as finished. A CSR can cancel forward dated to the end
of the term, which leaves the subscription `Cancelled` while payments are still
due until that date. Status alone would currently pick up 147 accounts in that
state, so the term has to be over as well.

Subscriptions are versioned in Zuora and each amendment creates a new version,
so the query only looks at the latest version of each. Earlier versions are all
`Expired`, never `Cancelled`, so without that filter every account would fail the
"every subscription is cancelled" test and nothing would ever be a target.

The account balance has to be zero. [zuora-rer][rer] refuses to erase an account
carrying a balance either way, and the same caution applies here. Nobody in this
set owes us anything, but 9 of them are in credit, down to -27.99, and scrubbing
the card we would refund to is not a decision to take in a batch job.

That one condition lives only in the query, not in `stillBillingReason`.
Mirroring it would mean reading the account back for all 500 items to catch a
balance that appeared since the overnight sync, and one extra Zuora call per
item is a poor trade for that.

[rer]: https://github.com/guardian/support-service-lambdas/tree/main/handlers/zuora-rer

## How it runs

A Step Function on a daily 6am cron, only enabled in PROD.

1. `get-payment-methods-to-scrub` queries BigQuery and writes the work list to
   S3.
2. A [distributed map][map] reads that file with an [S3JsonItemReader][reader]
   and feeds it to `scrub-payment-methods` one item at a time, via an
   [ItemBatcher][batcher] of one. A [ResultWriterV2][writer] drops the outcome
   back in S3.
3. The map result is read back, and if anything failed the team gets an SNS
   message through [SnsPublish][sns].

[map]: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions.DistributedMap.html
[reader]: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions.S3JsonItemReader.html
[batcher]: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions.ItemBatcher.html
[writer]: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions.ResultWriterV2.html
[sns]: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions_tasks.SnsPublish.html

### What a run leaves behind

Everything is keyed on the execution start time, so one run's files sit together
and you can find them from the execution in the console. From a real CODE run
(ids below are made up, this repo is public):

```
executions/2026-08-07T08:50:15.556Z/
├── payment-methods-to-scrub.json          written by step 1
└── 0a1b2c3d-4e5f-6071-8293-a4b5c6d7e8f9/  the map run id
    ├── manifest.json
    └── SUCCEEDED_0.json                   plus FAILED_0/PENDING_0 if any
```

The work list is a flat array, one entry per payment method, straight out of the
BigQuery query:

```json
[{ "payment_method_id": "2c92...", "account_id": "2c92...", "account_number": "A00123456" }]
```

`manifest.json` is what the state machine reads next. It points at the result
files, and it is the `FAILED` array being non-empty that triggers the SNS
notification:

```json
{
  "DestinationBucket": "scrub-non-tokenised-payment-methods-code",
  "MapRunArn": "arn:aws:states:eu-west-1:123456789012:mapRun:...",
  "ResultFiles": { "FAILED": [], "PENDING": [], "SUCCEEDED": [{ "Key": "...", "Size": 445461 }] }
}
```

Each entry in `SUCCEEDED_0.json` is one child execution, so you can see exactly
what a single item was given and what it returned:

```json
{ "Input": "{\"Items\":[{\"payment_method_id\":\"2c92...\"}]}",
  "Output": "{\"scrubbed\":0,\"wouldScrub\":0,\"skipped\":1}",
  "Status": "SUCCEEDED" }
```

### The daily cap

The query is capped at 500 rows, oldest first. There are 19,599 payment methods
in scope, going back to 2015, and roughly 200 a month keep arriving as accounts
become fully cancelled. Capping each run means the same code drains the backlog
over about six weeks and then quietly handles the trickle, which is only a few a
day, with no separate backfill job.

The cap is not there for Zuora's sake. Zuora limits how many requests you have in
flight at once, not how many you make in a day, and the map runs one item at a
time, so we are inside that by construction whatever the cap is. What the cap
buys is a bounded run: 500 items at a few calls each finishes well inside the
state machine's one hour timeout, where the whole backlog in one go would not,
and it keeps the first PROD runs small enough to actually read.

### Revalidation

The work list comes from BigQuery, which only contains Zuora data up to midnight:
Fivetran syncs the Zuora tables once a day, shortly after 00:00. In the hours
since, an account can take out a new subscription or someone can remove the card
by hand. Every item is therefore re-read from Zuora before anything is scrubbed:
the subscriptions are checked again, and so is the card's existence and status.
Anything that no longer qualifies is skipped.

That last check also makes the job idempotent for free. A scrubbed payment
method is no longer returned by Zuora, so a re-run simply doesn't find it and
skips it.

### Detecting a run that achieves nothing

That idempotence has a nasty edge. A scrubbed payment method stops being returned
by Zuora, so it is skipped next time, and a run where every item skips looks
exactly like a healthy one: the map succeeds, nothing fails, no alarm. If those
rows also never leave the BigQuery mirror, the same work list comes back every
day and the backlog never moves, quietly.

So a third state runs after the map, reads back what the map actually did, and
fails the run if it had payment methods to get through and scrubbed none of them.
It measures the outcome rather than the input, so it says nothing about a stale
mirror or a late Fivetran sync as long as work is still getting done, and it
holds no state of its own: each run is judged on its own merits and a bad day
cannot wedge the job.

It deliberately says nothing about an empty work list, which is the steady state
once the backlog is drained, and it is skipped in dry run, where nothing is ever
scrubbed.

**Before turning dry run off**, this is still the thing to watch: the day after
the first real run, check that the payment methods it scrubbed have dropped out
of the query.

## Config

One parameter, at the standard config path:

```
/<STAGE>/support/scrub-non-tokenised-payment-methods/gcpCredentialsConfig
```

It holds the workload identity federation config used to reach BigQuery. GuCDK
grants the lambda read access to that path for free, and `loadConfig` parses it
through a zod schema, so a missing value fails the run rather than reaching the
GCP client as `undefined`.

## Dry run

`DRY_RUN` is set to `true` on the lambdas. The scrub step still runs every check
and logs what it would have done, but writes nothing to Zuora, and the progress
check stays quiet because in dry run nothing is ever scrubbed. Flip it to `false`
once a PROD run has been eyeballed.
