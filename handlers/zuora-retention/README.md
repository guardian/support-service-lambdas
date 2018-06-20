# Zuora retention lambdas

State machine that generates zuora reports to find accounts with just long cancelled subscriptions and mark them as excluded from processing into the data lake. 

## State machine
In a simplified way the execution of the state machine defined in this project can be summarised as:

Query zuora -> fetch zuora results -> transfer files -> filter results -> update accounts
  
### Query zuora

This step uses the common code in zuora-reports to define a querier lambda that submits queries needed to get the list of old accounts from Zuora. Because of Zuora limitations this cannot be executed in one query so 2 queries are needed and the results are combined in the filtering step later on.
The 2 queries submited by this lambda are :
* List of candidate accounts:  all Accounts with subscriptions that have been cancelled before a certain date
* Exclusion list:  all Accounts with subscriptions that have not been cancelled before the same date

For more information about the details of this lambda check the [zuora-reports readme](../../lib/zuora-reports/README.md)
### Fetch zuora result
This step check with zuora until the queries are done executing and zuora file ids are provided.

For more information about the details of this lambda check the [zuora-reports readme](../../lib/zuora-reports/README.md)
### Transfer files
This step will download the files from zora into the zuora-retention-[STAGE] bucket. 
All files will be placed into a directory named after the job id to avoid different executions interfering with each other.
In the real step machine this is actually two states :
* A task state that fetches one file at a time
* A choice state that checks if there still are remaining files to fetch and decides whether to move on or to go back to the previous state

For more information about the details of this lambda check the [zuora-reports readme](../../lib/zuora-reports/README.md)
### Filter result
In this step all the results from the list of candidates that are also present in the exclusion list are filtered out, leaving the list of accounts we want to update.
The result of this step will be saved in the same bucket and directory as the zuora reports with the name 'doNotProcess.csv'
#### input
```
{
  "jobId": "2c92c0f863f7f0400164183fbd8f10b6",
  "fetched": [
    {
      "fileId": "2c92c08663f7f0170164183fc34b37a5",
      "name": "exclusionQuery",
      "uri": "s3://zuora-retention-code/2c92c0f863f7f0400164183fbd8f10b6/exclusionQuery.csv"
    },
    {
      "fileId": "2c92c08663f7f0170164183fc2a237a4",
      "name": "candidatesQuery",
      "uri": "s3://zuora-retention-code/2c92c0f863f7f0400164183fbd8f10b6/candidatesQuery.csv"
    }
  ],
  "done": true,
  "dryRun": true
}
```
#### output
```
{
  "jobId": "2c92c0f863f7f0400164183fbd8f10b6",
  "uri": "s3://zuora-retention-code/2c92c0f863f7f0400164183fbd8f10b6/doNoProcess.csv",
  "dryRun": true
}
```
### Update account  
The file generated in the previous step is iterated over and each account is updated with ProcessingAdvice= 'DoNotProcess'.

Similarly to the fetch files step, in the actual state machine this is represented by two states in order to accommodate work loads that take longer than the limit on a single lambda execution time:
* updateAccounts step: this will update as many accounts as possible until it's within a minute of the lambda execution time limit. if it runs out of time it will return done=false and skipTo set to the first line of the file that was not processed
* checkRemainingAccounts step: just a choice state to re-run updateAccounts until it returns done = true
#### input
```
{
  "uri": "s3://zuora-retention-code/2c92c0f963f800a901641ccfe6fd2344/doNoProcess.csv",
  "skipTo" : 3
}
```
the uri parameter determines where the file should be fetched from and the option skipTo param determines the first line of the file that should be processed (excluding headers)

#### output
```
{
  "done": false,
  "uri": "s3://zuora-retention-code/2c92c0f963f800a901641ccfe6fd2344/doNoProcess.csv",
  "skipTo": 10
}
```

The output looks a lot like the input in order to be able to iterate. 

### State machine input
Here's an example of the input that can be used to start the state machine:
```
{
    "cutOffDate": "YYYY-MM-DD",
    "dryRun" : true
}
```

The optional cutOffDate param determines the latest date a subscription can be cancelled and still be considered 'Old'. If this parameter is omitted it defaults to 30 months ago.

If the dryRun param is set to true then the account updating step will be skipped. This is used for debugging by inspecting the doNotProcess.csv file to see what accounts would be updated if this wasn't a dry run exectuion.