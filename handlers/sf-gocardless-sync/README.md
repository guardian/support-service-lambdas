# sf-gocardless-sync
Polls GoCardless for direct debit mandate events and pushes into SalesForce

#### General Process
1. Fetch the last processed event from SalesForce (there might not be one)
2. Fetch [`[batchSize]`](#Batching-(API-limits)) worth of events from GoCardless events endpoint (filtering on Mandate Events), **which occur after** either
    1. the GoCardless Event ID returned from step one (i.e. SalesForce already has some GoCardless data)
    2. 25 Aug 2015 (since this is when the first event occurred in production GoCardless) - this would be the start of a back-fill
3. In a single request, lookup the IDs of all the Mandate records in SalesForce which are referenced by the current batch
 of events to process (so we can later link the new event to the existing mandate or create mandate too if it doesn't already exist)
4. In a single request fetch existing payment method & billing account records in SalesForce which are referenced by the current batch events to process 
5. Now for each mandate event in the batch 
    1. Create the `DD Mandate` record (if it doesn't already exist in SalesForce)
    2. Create the `DD Mandate Event` record (with the ID from the previous step, and the payment method & billing account
     references if they exist)
    3. Update the `DD Mandate record` to mark the new event as the latest event

#### Polling
Achieved by invoking this Lambda via a `AWS::Events::Rule` configured in [cfn.yml](cfn.yaml) (currently every 5 mins)

#### Batching (API limits)
To avoid eating up the SalesForce (or indeed GoCardless) API limit, each invocation of this lambda is limited to 
processing a limited number of events per invocation as defined in the config file (`goCardless-{STAGE}.json`) in the 
`gu-reader-revenue-private/membership/support-service-lambdas` S3 bucket. NOTE: this is capped at 200 in the code.

The number of actual API calls to Salesforce will be 3-5 times more than this batch limit (as a number of calls are required
 per mandate event, and this is variable as to whether the underlying mandate object needs to be created).

Perhaps in future we could be more sophisticated in how this limit works, since lots of the events come in bursts which
 therefore take longer to process if limited by batches, what we want is really a rolling 24 hour cap on API calls.

#### Back-fill & Sync Duality
This lambda is designed to both back-fill and keep SalesForce up to date (with no additional params required), 
essentially on each invocation of the Lambda it processes a certain number of GoCardless Mandate Events, using the 
_last processed_ event as a starting point. This means that if SalesForce doesn't have any events yet, this will just 
back-fill from the beginning of time, however if SalesForce has some events this will just continue from the last event.

#### SalesForce Objects
- DD Mandates (`DD_Mandate__c`)
- DD Mandate Events (`DD_Mandate_Event__c`)

#### Errors
There are a few log filters & alarms configured in [cfn.yml](cfn.yaml) 
- "GenericError Count" filer & alarm, is fired if "HTTP request was unsuccessful" is found in the logs. **Fairly important
 given this lambda is designed to stop processing events upon any error (to avoid missing data)**
- TODO add metric events processed filter and mandate records created filter (with alarm if this drops below certain threshold per 12 hours)
- TODO add 'StoppedRunning' alarm based on existing Invocations metric
- TODO add a 'SocketTimeoutException' alarm if occurs more than 3 times in a row 