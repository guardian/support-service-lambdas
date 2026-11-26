# email-reminders

Receives Zuora callouts ahead of subscription billing dates and works out which reminder or notice email, if any, each subscriber is due.

Current status: work in progress. No emails are sent; the processor only logs what it would send.

## How it works

```mermaid
flowchart LR
    subgraph Zuora
        event["Scheduled event<br/>RatePlanCharge.ChargedThroughDate<br/>daily 03:00, 14 days before"]
        definition["Notification definition<br/>filter: active, auto-renew, UK"]
        template["Callout template<br/>x-api-key header"]
        event --> definition --> template
    end

    subgraph AWS
        api["API Gateway + lambda<br/>email-reminders-STAGE"]
        queue[("SQS<br/>email-reminders-processor-queue-STAGE")]
        dlq[("Dead letter queue")]
        processor["Processor lambda<br/>email-reminders-processor-STAGE"]
        logs["CloudWatch logs<br/>EMAIL_REMINDER_OUTCOME"]
        alarm["Alarm<br/>EMAIL_REMINDER_CHARGE_NOT_BILLING"]
    end

    template -- "POST /zuora-callouts/billing-date<br/>one per charge" --> api
    api --> queue
    queue --> processor
    queue -. "after 3 failures" .-> dlq
    processor -- "GET subscription" --> zuoraApi["Zuora REST API"]
    processor --> logs
    processor -. "charge no longer billing" .-> alarm
```

1. A Zuora scheduled event on `RatePlanCharge.ChargedThroughDate` runs daily at 03:00 (London) and sends a callout for each charge billing in 14 days, filtered to active, auto-renewing UK subscriptions.
2. The API (`email-reminders-STAGE`) validates the callout and puts it on the `email-reminders-processor-queue-STAGE` queue.
3. The processor (`email-reminders-processor-STAGE`) fetches the subscription. A subscription gets one callout per charge, so only the callout for the first charge billing on that date (the lowest charge number) is processed.
4. It classifies the billing date and logs an `EMAIL_REMINDER_OUTCOME` line.

If a callout's charge no longer bills on the date (the subscription changed in between), it logs `EMAIL_REMINDER_CHARGE_NOT_BILLING`, which triggers an alarm.

## URLs

- CODE: https://email-reminders-code.support.guardianapis.com/
- PROD: https://email-reminders.support.guardianapis.com/

Requests need an `x-api-key` header. In Zuora it is set as a custom header on the callout template.

## Zuora configuration

The scheduled event, callout template and notification definition are created or updated by a script. Existing objects are matched by name, so it is safe to re-run. Get the API key from the `email-reminders-key-STAGE` API Gateway key, then:

```sh
STAGE=CODE AWS_PROFILE=membership CALLOUT_API_KEY=... pnpm configure-zuora           # dry run
STAGE=CODE AWS_PROFILE=membership CALLOUT_API_KEY=... pnpm configure-zuora --apply --active
```

Without `--active` the event and notification definition are left inactive. The event runs daily at 03:00 in the Zuora tenant time zone; set `RUN_AT=HH:MM` to override it, e.g. for a test run, and re-run without it afterwards.

## Testing

Run `pnpm test` in this directory.

To send a callout to CODE as Zuora would:

```sh
curl -i -X POST https://email-reminders-code.support.guardianapis.com/zuora-callouts/billing-date \
  -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"subscriptionNumber":"A-S00123456","accountNumber":"A00123456","chargeNumber":"C-00123456","chargedThroughDate":"2026-12-09"}'
```

## References

- [Zuora custom scheduled events](https://docs.zuora.com/en/zuora-platform/extensibility/events-and-notifications/custom-scheduled-events/custom-scheduled-event-overview)
- [Zuora callout notifications](https://docs.zuora.com/en/zuora-platform/extensibility/events-and-notifications/notifications/callout-notification-overview)
- [Zuora notification definition API (filter rules)](https://developer.zuora.com/v1-api-reference/api/notifications/post_create_notification_definition.md)
