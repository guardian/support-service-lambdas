# soft-opt-in-consent-setter

This is a lambda that alters a user's Soft Opt-In setting based on the subscriptions they acquire and cancel.

The scheduled lambda fetches 200 subscriptions at a time from Salesforce, processes acquisitions, product switches and cancellations, sets consents in IDAPI, and updates the Salesforce records with the outcome. IAP events are processed from a queue.

For an acquisition, it will enable the Soft Opt-In consents associated with that subscription according to the consents mapping.

For a cancellation, it will disable the Soft Opt-In consents that are associated only with the subscription being cancelled, except similar_guardian_products

## Secondary user access

Cancellation and product-switch processing include an active secondary-user holding when deciding which consents to keep. Both the scheduled Salesforce path and the IAP event path use the [multiple-accounts API](../multiple-account-api/openapi.yaml) to check active secondary access by identity ID. Salesforce remains the source for other Zuora holdings.

The API key is read from `/{STAGE}/membership/soft-opt-in-consent-setter/multiple-account-api-key` in SSM Parameter Store. A missing key or an API outage fails the scheduled run without consuming per-record retry attempts. An identity-specific API error prevents that identity's consent update while the other scheduled records continue. IAP events fail for retry instead.

If it is unable to update a record, it will increment the number of retries and try again later in a subsequent run. It will only attempt to update records 5 times.

## Metrics

As it processes records, this lambda emits metrics.
A [dashboard](https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#dashboards:name=Soft-Opt-In-Consent-Setter)
has been created to visualise these metrics and help monitor the lambda.

**successful_run**: Shows the occurrence of a successful lambda run.

**failed_run**: Shows the occurrence of a failed run.

**successful_consents_updates**: Shows how many successful IDAPI Soft Opt-In consent updates took place.

**failed_consents_updates**: Shows how many records could not complete consent processing, including IDAPI or secondary-access lookup failures.

**successful_salesforce_update**: Shows how many successful Salesforce record updates took place.

**failed_salesforce_update**: Shows how many failed Salesforce record updates took place.

## Errors & Alarms

The lambda was created robust enough to autonomously recover from errors with minimal developer input. Fixing the
underlying cause of the error and letting the lambda continue to run on its schedule will cause the lambda to pick up
where it left off and sort out any de-syncs between IDAPI and Salesforce that might have happened.

When errors do occur they are always logged, and a metric is emitted.

Because of the robustness of lambda, the `failedRunAlarm` and `failedUpdateAlarm` alarms can safely be configured to
trigger only after a number of occurrences (instead of on first occurrence). This way these alarms will stay silent in
the event of temporary problems (such as outage in IDAPI or Salesforce), meaning developers are only alerted when
something actually needs addressing.

### failedRunAlarm

**CAUSE**: Two or more runs found an error and were unable to complete. This can be due to several reasons:

1. Failed to obtain all environment variables.
1. Failed to contact Salesforce endpoint.
1. Failed to authenticate in Salesforce.
1. Error decoding Salesforce's responses.
1. Failed to load the multiple-accounts API key.

The [lambda's logs](https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fsoft-opt-in-consent-setter-PROD)
will provide more details regarding which of these is taking place.

**IMPACT**: Each of these situations will have different impacts:

1. The lambda was unable to run and no subscriptions were processed.
1. Depending on which endpoint it failed to contact, it might have been unable to fetch records to process, or it might
   not have been able to update their state after processing the records.
1. Failed to authenticate in Salesforce.
1. Error decoding Salesforce's responses.
1. Pending cancellations and product switches were not processed, but any acquisitions earlier in the run may have been.

**FIX**: For each corresponding cause:

1. Check the CloudFormation template for environment variables and make sure all the necessary key-values are present.
1. Check that the Salesforce endpoints are correct and online.
1. Check that the Salesforce credentials fetched from secrets manager at deploy stage are valid.
1. Check that the endpoint being used is correct and the version (`sfApiVersion` in CloudFormation) is correct. Check
   that the Salesforce API version being used returns what the lambda expects. Check the code for any changes to how the
   relevant response is decoded.
1. Check the SSM parameter and the Lambda role's permission to read it. The pending records will be retried on the next run.

For all the above, fixing the underlying issues and letting it run on schedule will put the system in a correct state.

### failedUpdateAlarm

**CAUSE**: A run failed to update (some) records in Salesforce in the last hour. This could be due to edge cases such as
access permissions on the record being updates, record being locked due to another process making changes on it, or
record being in a failed state.

**IMPACT**: The user's Soft Opt-In consents were updated in IDAPI, but the result of this updated was not successfully
written to it's Salesforce record. This means that the change will be retried again on the next lambda runs until the
problem is fixed.

**FIX**: Check the logs to determine what's cause of this error. Check the relevant record in Salesforce for any
anomaly.

After the underlying issue is fixed, letting the lambda continue to run on schedule will update Salesforce to the
correct state.

For all the above, after the underlying issue is resolved, the `Soft_Opt_in_Number_of_Attempts__c` fields needs to be
reset to 0 for each of the affected records. After that the lambda will pick up those records for processing again.
