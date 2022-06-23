# Digital Voucher (Subscription Card) suspension processor

:warning: **For troubleshooting tips because an alarm has gone off, see the
[Subscription Card Recovery Runbook](https://docs.google.com/document/d/1YK-PcIvNcETacJs4VlTZtle5vdTtYoVN8h1fmzNYblw).**

See the
[lifecycle of the digital voucher](../digital-voucher-api/README.md#digital-voucher-lifecycle).

This processor temporarily suspends the fulfilment of a Subscription Card.
A Subscription Card consists of a card and a letter.
While it's suspended, the card will be disabled and the letter will stop accruing value.

The processor works by:
1. Fetching Subscription Card subscriptions from Salesforce that have future suspensions on them
which have already been processed in Zuora.
1. Sending these subscriptions to Imovo to apply the suspension there, to disable the card and
letter.
1. If successful, the `Sent_To_Digital_Voucher_Service__c` field of the associated
`Holiday_Stop_Requests_Detail__c` is updated in Salesforce with the time that the successful
response came back from Imovo.
