# zuora-reports
This project contains reusable code for zuora reports lambdas. Currently it's being used in the zuora retention project.

* zuora-reports-querier: Submits Zuora AQuA query jobs
* zuora-reports-jobResult: Checks the status of submitted Zuora AQuA query jobs 
* zuora-reports-fileFetcher: Fetches csv result files from completed jobs and saves them in S3


## zuora-reports-querier
Used to submit query jobs to Zuora AQuA. This lambda does not define the request format as the parameters needed will vary depending on the specific queries to execute. 
To deploy this as a lambda a 'query generator' the request type must be specific along with a 'query generator' function that converts from our custom request into a Zuora Aqua query request than can be executed.

### sample usage
Here is an example of a successful request which returns the job id that can be passed to the jobResult lambda and check the status of the job.
#### Input

```
{
"dryRun": false,
.. any other custom parameters 
}
```

#### Ouput
```
{
  "name": "someQueryJob",
  "jobId": "23049832094823098403284039284",
  "dryRun": false
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
  "jobId": "23049832094823098403284039284",
  "dryRun": false
}
```
#### completed job output
```
{
  "name": "someQueryJob",
  "jobId". "23049832094823098403284039284",
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
  ],
  "dryRun": false
}
```
#### pending job output
```
{
  "name": "someQueryJob",
  "status" : "pending",
  "dryRun": false
}
```
## zuora-reports-fileFetcher
This lambda is used to fetch the results of a query using the file ids retrieved from the response of JobResult.

### sample usage
This lambda will accept a list of files to download but will download just one of them on each execution. It will typically be used in step functions followed with a condition state that will make it run again until it is done fetching all files.
Since this lambda's output will be used as it's own input on the next iteration it's requests and responses follow the same format. 
The main components of the input/output are :
* a list of batches representing the files to fetch from zuora into s3
* a list of fetched files so far
* a done boolean to indicate when the iteration should stop

As the iteration goes on this lambda should move the files in the batches list into the fetched list until there are no more batches to move, in which case the lambda will return done = true

 
 #### input / output
```
{
{
  "jobId": "23049832094823098403284039284",
  "fetched": [
    {
      "fileId": "10293821098320983091283012",
      "name": "subs",
      "uri": "s3://[SOME_BUCKET]/23049832094823098403284039284/subs.csv"
    }
  ],
  "batches": [
    {
      "fileId": "20341983092183092180392810",
      "name": "accounts"
    }
  ],
  "done": false,
  "dryRun": false
}
}
```


##dryRun parameter
This parameter will be present in all inputs and outputs but is not used by these lambdas, it is up to the projects using this to have a different behaviour whenever an execution is a dry run. The parameter has to be in all inputs and outputs in order to reach later steps when used within step functions. 