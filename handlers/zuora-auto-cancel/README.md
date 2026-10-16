# zuora-auto-cancel

## Overview

This handler is an API gateway called by Zuora on invoice overdue, which feeds an
SQS queue, which triggers AutoCancelSqsHandler.

- cancels subscriptions that have an overdue invoice, using the Zuora Orders API
- sends the associated cancellation emails via braze-emails-STAGE queue

## Testing

Run `sbt "project zuora-auto-cancel" test`.

To get all the emails from Braze, run the `EmailClientSystemTest` against your own
email address - you should get a deluge of emails.
