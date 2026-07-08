# promotions-lambdas

`promotions-lambdas` syncs changes made in the promo code tool into other systems.

## Lambdas

### Promo code view updater

Source: [src/handlers/promoCodeView.ts](src/handlers/promoCodeView.ts)

This is needed for (tbc - not sure?)

- Consumes DynamoDB stream events from `support-admin-console-promos-{STAGE}`.
- Reads campaign metadata from `support-admin-console-promo-campaigns-{STAGE}`.
- Builds a flattened promo-code view record, enriched with campaign metadata.
- Writes to `MembershipSub-PromoCode-View-{STAGE}`.
- Returns per-record batch failures so failed records are retried.

### Salesforce export

Source: [src/handlers/salesforceExport.ts](src/handlers/salesforceExport.ts)

This is needed so CSRs can see the available promo codes so they know more information about
discounts that customer have.

They are then synced from SF into BQ via fivetran and ultimately into [the reader revenue data asset](https://console.cloud.google.com/bigquery?ws=!1m5!1m4!4m3!1sdatatech-platform-prod!2sreader_revenue!3sdim_promotion_code)

- Runs 8am every morning
- Reads from `MembershipSub-PromoCode-View-{STAGE}`.
- Upserts promo-code records into Salesforce Promotion_Code__c object using Bulk API.
- Validates records and drops invalid rows rather than blocking valid exports.

## How to Test

Manual CODE verification:

1. Update a promo in CODE Support Admin Console https://support.code.dev-gutools.co.uk/promo-tool
1. Check cloudwatch logs for [promotions-lambdas-promo-code-view-CODE](https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fpromotions-lambdas-promo-code-view-CODE).
1. Confirm corresponding row changes in [MembershipSub-PromoCode-View-CODE](https://eu-west-1.console.aws.amazon.com/dynamodbv2/home?region=eu-west-1#table?name=MembershipSub-PromoCode-View-CODE).
1. After export runs, re-run and check logs for [promotions-lambdas-salesforce-export-CODE](https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fpromotions-lambdas-salesforce-export-CODE) and verify promo details in Salesforce.

