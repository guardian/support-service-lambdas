# email-reminders

Receives Zuora callouts ahead of subscription billing dates.

Current status: work in progress. The API only validates and logs callouts.

## URLs

- CODE: https://email-reminders-code.support.guardianapis.com/
- PROD: https://email-reminders.support.guardianapis.com/

Requests need an `x-api-key` header. In Zuora it is set as a custom header on the callout template.

## Testing

Run `pnpm test` in this directory.

To send a callout to CODE as Zuora would, get the API key from the `email-reminders-key-CODE` API Gateway key, then run:

```sh
curl -i -X POST https://email-reminders-code.support.guardianapis.com/zuora-callouts/billing-date \
  -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d '{"subscriptionNumber":"A-S00123456","accountNumber":"A00123456","ratePlanChargeId":"8a12345678901234567890123456789a","chargedThroughDate":"2026-12-09"}'
```

## References

- [Zuora custom scheduled events](https://docs.zuora.com/en/zuora-platform/extensibility/events-and-notifications/custom-scheduled-events/custom-scheduled-event-overview)
- [Zuora callout notifications](https://docs.zuora.com/en/zuora-platform/extensibility/events-and-notifications/notifications/callout-notification-overview)
- [Zuora notification definition API (filter rules)](https://developer.zuora.com/v1-api-reference/api/notifications/post_create_notification_definition.md)
