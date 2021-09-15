# soft-opt-in-consent-setter

This is a lambda that alters a user's Soft Opt-In setting based on the subscriptions they acquire and cancel.

The lambda will fetch 200 subscriptions at a time from Salesforce, process them, set the consents in IDAPI, and update
their records in Salesforce with the outcome. It will first process acquisitions and then process cancellations.

For an acquisition, it will enable the Soft Opt-In consents associated with that subscription according to the consents
mapping.

For a cancellation, it will disable the Soft Opt-In consents that are associated only with the subscription being
cancelled, out of all the products the user has active.

If it is unable to update a record, it will increment the number of retries and try again later in a subsequent run. It
will only attempt to update records 5 times.

## Metrics

As it processes records, this lambda emits metrics.
A [dashboard](https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#dashboards:name=Soft-Opt-In-Consent-Setter)
has been created to visualise these metrics and help monitor the lambda.

**successful_run**: Shows the occurrence of a successful lambda run.

**failed_run**: Shows the occurrence of a failed run.

**successful_consents_updates**: Shows how many successful IDAPI Soft Opt-In consent updates took place.

**failed_consents_updates**: Shows how many failed IDAPI Soft Opt-In consent updates took place.

**subs_with_five_retries**: Shows how many subscriptions reached 5 retries during the run.

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

The [lambda's logs](https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fsoft-opt-in-consent-setter-PROD)
will provide more details regarding which of these is taking place.

**IMPACT**: Each of these situations will have different impacts:

1. The lambda was unable to run and no subscriptions were processed.
1. Depending on which endpoint it failed to contact, it might have been unable to fetch records to process, or it might
   not have been able to update their state after processing the records.
1. Failed to authenticate in Salesforce.
1. Error decoding Salesforce's responses.

**FIX**: For each corresponding cause:

1. Check the CloudFormation template for environment variables and make sure all the necessary key-values are present.
1. Check that the Salesforce endpoints are correct and online.
1. Check that the Salesforce credentials fetched from secrets manager at deploy stage are valid.
1. Check that the endpoint being used is correct and the version (`sfApiVersion` in CloudFormation) is correct. Check
   that the Salesforce API version being used returns what the lambda expects. Check the code for any changes to how the
   relevant response is decoded.

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

### subsWith5RetriesAlarm

**CAUSE**: One or more subscription's Soft Opt-In consents failed to be set after five retries. This can be due to
several reasons:

1. Failed to contact the IDAPI endpoint
1. IDAPI was unable to set the user's Soft Opt-In consents.

The [lambda's logs](https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fsoft-opt-in-consent-setter-PROD)
will provide more details regarding which of these is taking place.

**IMPACT**: The lambda will no longer try to process this request.

**FIX**: For each corresponding cause:

1. Check that the IDAPI endpoints are correct and online.
1. Check the logs for the error code being returned by the endpoint and contact the Identity team to understand why
   IDAPI was unable to set the user's Soft Opt-In consents. Most of the time this will be a user who no longer has an 
   Identity account, in which case no action is necessary.

For all the above, after the underlying issue is resolved, the `Soft_Opt_in_Number_of_Attempts__c` fields needs to be
reset to 0 for each of the affected records. After that the lambda will pick up those records for processing again.
