# zuora-auto-cancel

## Overview

This handler is an API gateway called by Zuora on invoice overdue, which feeds an
SQS queue, which triggers AutoCancelSqsHandler.

- cancels subscriptions that have an overdue invoice, using the Zuora Orders API
- sends the associated cancellation emails via braze-emails-STAGE queue

## Testing

Run `sbt "project zuora-auto-cancel" test`.

### Testing against CODE

This sends a callout to the deployed CODE API Gateway, exactly as Zuora does.

1. Get suitable janus credentials for membership
1. run the below comand (feel free to replace the placeholders with suitable values)
```sh
aws s3 cp --profile membership \
  s3://gu-reader-revenue-private/membership/support-service-lambdas/CODE/trustedApi-CODE.v1.json - \
  | jq -r .apiToken \
  | xargs -I{} curl -i -X POST "https://zuora-auto-cancel-code.membership.guardianapis.com/?apiToken={}&apiClientId=unused" \
    -H "Content-Type: application/json" \
    -d '{
      "accountId": "YOUR_CODE_ACCOUNT_ID",
      "autoPay": "true",
      "email": "test.user@thegulocal.com",
      "firstName": "Test",
      "lastName": "User",
      "paymentMethodType": "CreditCardReferenceTransaction",
      "creditCardType": "Visa",
      "creditCardExpirationMonth": "01",
      "creditCardExpirationYear": "2030",
      "invoiceId": "YOUR_OVERDUE_INVOICE_ID",
      "currency": "GBP",
      "sfContactId": "YOUR_SF_CONTACT_ID"
    }'
```
Expect `200 OK` with `{ "status": "accepted" }` to show that the message was queued.
Check the result in the logs of [/aws/lambda/zuora-auto-cancel-CODE](https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fzuora-auto-cancel-CODE).

### Testing against CODE

This sends a callout to the deployed CODE API Gateway, exactly as Zuora does.

1. Get suitable janus credentials for membership
1. run the below comand (feel free to replace the placeholders with suitable values)
```sh
aws s3 cp --profile membership \
  s3://gu-reader-revenue-private/membership/support-service-lambdas/CODE/trustedApi-CODE.v1.json - \
  | jq -r .apiToken \
  | xargs -I{} curl -i -X POST "https://zuora-auto-cancel-code.membership.guardianapis.com/?apiToken={}&apiClientId=unused" \
    -H "Content-Type: application/json" \
    -d '{
      "accountId": "YOUR_CODE_ACCOUNT_ID",
      "autoPay": "true",
      "email": "test.user@thegulocal.com",
      "firstName": "Test",
      "lastName": "User",
      "paymentMethodType": "CreditCardReferenceTransaction",
      "creditCardType": "Visa",
      "creditCardExpirationMonth": "01",
      "creditCardExpirationYear": "2030",
      "invoiceId": "YOUR_OVERDUE_INVOICE_ID",
      "currency": "GBP",
      "sfContactId": "YOUR_SF_CONTACT_ID"
    }'
```
Expect `200 OK` with `{ "status": "accepted" }` to show that the message was queued.
Check the result in the logs of [/aws/lambda/zuora-auto-cancel-CODE](https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fzuora-auto-cancel-CODE).
