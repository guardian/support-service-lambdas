#TODO edit this so that it makes sense for retention
# zuora-reports  
This project consists of 4 lambdas used for zuora report generation:
* zuora-reports-querier: Submits Zuora AQuA query jobs
* zuora-reports-jobResult: Checks the status of submitted Zuora AQuA query jobs 
* zuora-reports-fileFetcher: Fetches csv result files from completed jobs and saves them in S3

These lambdas are exported to be used as part of step functions that require zuora reports.
## zuora-reports-querier
Used to submit query jobs to Zuora AQuA. The lambda takes an array of AQuA queries and returns a jobId that can later be used to get the results.
### sample usage
Here is an example of a successful request which returns the job id that can be passed to the jobResult lambda and check the status of the job.
#### Input
```
{
  "name": "someQueryJob",
  "queries": [
    {
      "name": "subs",
      "query": "SELECT Id FROM Subscription WHERE  Name='1234'"
    },
    {
      "name": "accounts",
      "query": "SELECT Id FROM Account WHERE  Name='4321'"
    }    
  ]
}
```
#### Ouput
```
{
  "name": "someQueryJob",
  "jobId": "23049832094823098403284039284"
}
```

##zuora-reports-jobResult
This Lambda is used to check the status of an Aqua job (normally submitted using the querier lambda).
The response will include whether the job is completed or not and the file id that can be used to fetch the results.
### sample usage
Here we get the results of the job submitted in the previous example and get a completed response with the file ids we will need to download the query results: 
#### input
```
{
  "jobId": "23049832094823098403284039284"
}
```
#### completed job output
```
{
  "name": "someQueryJob",
  "status": "completed",
  "batches": [
    {
      "fileId": "10293821098320983091283012",
      "name": "subs"
    },
    {
      "fileId": "20341983092183092180392810",
      "name": "accounts"
    }
  ]
}
```
#### pending job output
```
{
  "name": "someQueryJob",
  "status" : "pending"
}
```
## zuora-reports-fileFetcher
This lambda is used to fetch the results of a query using the file ids retrieved from the response of JobResult.

### sample usage
The input contains the the file id and the location we want to full within the zuora-reports-[STAGE] bucket.

The output will contain the uri of the file with the results of the query.
This uri will remain valid for up to a day to ensure complicance with GDPR.
 
 #### input
```
{
  "fileId": "20341983092183092180392810",
  "saveLocation": "myReports/accounts.csv"
}
```
#### output
```
{
  "fileId": "20341983092183092180392810",
  "uri": "s3://zuora-reports-code/myReports/accounts.csv"
}
```