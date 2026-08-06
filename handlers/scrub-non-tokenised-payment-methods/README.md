# scrub-non-tokenised-payment-methods

This handler is a state machine that runs daily to clear non-tokenised card data
from Zuora accounts with no active subscriptions.

## Why

A `CreditCard` payment method in Zuora holds the card details themselves. A
`CreditCardReferenceTransaction` holds only a gateway token, and the card lives
at Stripe or PayPal instead. We have roughly 39,000 `CreditCard` payment methods
against 2.78 million `CreditCardReferenceTransaction` ones.

Once every subscription on an account is cancelled, those card details can never
be used again. Keeping them is pure risk with no upside.

### This is an ongoing mechanism, not a one off

`CreditCard` is not a dead type we are clearing out. It is what you get when card
details are entered in Zuora directly, and around 200 to 250 are still created a
month, steady, with no sign of declining. About 88 percent of the recent ones
land on an account that already existed, so they look like card updates rather
than new signups.

What is old is the backlog currently in scope, because a card only becomes a
target once every subscription on its account is cancelled, which happens long
after the card was added. Hence 6,000 in scope from 2018 alone against 121
created this year. A card added today simply becomes eligible later.

That is why this is a scheduled job rather than a cleanup script: the stock is
historical, but the source is live and will keep feeding it.

## Scrub, not delete

The card asked for deletion. We use Zuora's scrub endpoint instead, which strips
the card data but leaves the payment records that reference it intact, so we
keep the audit trail of which payment was taken with which method.

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
9,050 of them are the default on an account with `autoPay` still true.

**Scrub works on a cancelled account. Delete does not.** Where the Zuora account
itself has status `Canceled`, both of these are rejected:

```
DELETE /v1/payment-methods/{id}   -> 50000030 Cannot delete payment method on a canceled account
PUT    /v1/accounts/{number}      -> 51500030 Cannot update a cancelled account
```

There is no way through: you cannot delete it and you cannot detach it either.
Only 5 of the current targets are in that state, the other 19,728 sit on
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

Cancelled is not the same as finished. A CSR can cancel forward dated to the end
of the term, which leaves the subscription `Cancelled` while payments are still
due until that date. Status alone would currently pick up 147 accounts in that
state, so the term has to be over as well.

Subscriptions are versioned in Zuora and each amendment creates a new version, so
the query only looks at the latest version of each. An account with an active
subscription and several old cancelled versions is not a target.

## How it runs

A Step Function on a daily 6am cron, only enabled in PROD.

1. `get-payment-methods-to-scrub` queries BigQuery and writes the work list to
   S3.
2. A distributed map feeds that list one item at a time to
   `scrub-payment-methods`.
3. The map result is read back, and if anything failed the team gets an SNS
   message.

### The daily cap

The query is capped at 500 rows, oldest first. There are 19,744 payment methods
in scope, going back to 2015, and a dozen to thirty a month keep arriving as
accounts become fully cancelled. Capping each run means the same code drains the
backlog over about six weeks and then quietly handles the trickle, with no
separate backfill job. It also keeps the run comfortably inside Zuora's rate
limit.

### Revalidation

The work list comes from BigQuery, which lags Zuora by up to a sync interval. In
that window an account can take out a new subscription or someone can remove the
card by hand. Every item is therefore re-read from Zuora before anything is
scrubbed: the subscriptions are checked again, and so is the card's existence and
status. Anything that no longer qualifies is skipped.

That last check also makes the job idempotent for free. A scrubbed payment
method is no longer returned by Zuora, so a re-run simply doesn't find it and
skips it.

## Dry run

`DRY_RUN` is set to `true` on the lambda. In that mode every check runs and the
intended action is logged, but nothing is written to Zuora. Flip it to `false`
once a PROD run has been eyeballed.
