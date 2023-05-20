# Zuora to Datalake incremental export

## How do we know when it fails?

* Cloudwatch Alert email is sent to SX mailing list.
* Ophan alerts if it detects out-of-date CSV in raw buckets by sending an email with says something like `supporter-experience team has out-of-date tables`

## How to retry the export manually (via incrementalTime)?

### tdlr:

1. Run zuora-datalake-export-PROD lambda with `{"exportFromDate": "2022-05-04"}`
1. If lambda is successfull, run Spark jobs by clearing zuora_account table
1. If lambda is not successfull due to time or memory, wait for Zuora aqua jobs to finish, and then run the following app to complete the remaining steps https://github.com/guardian/support-service-lambdas/pull/769, and then run Spark jobs by `Clear`ing zuora_account table via Airflow

### More detailed explanation of steps:

1. Say, alarm email is sent to SX mailbox saying tables are out of date on 06.04.2021
1. Go to zuora-datalake-export-PROD lambda in AWS Console
1. Run the lambda with `{"exportFromDate": "2022-05-04"}` which fetches incremental changes from that date
1. If the date is not to far back in the past then the lambda will likely complete within 15mintes and within memory limit
1. If lambda is successfull, 
   1. fresh CSV files will have been dropped in ophan buckets, so optionally check the timestamps on them, for example, `ophan-raw-zuora-increment-invoiceitem` bucket. 
   1. If lambda is successfull, run spark jobs via [airflow](https://zc6e7edd5b7c7cbb9p-tp.appspot.com/admin/airflow/graph?dag_id=supporter-experience) by clicking `Clear` on `zuora_account`. This should trigger all the children jobs as well as all zuora_* tables depend on zuora_account.
1. If lambda is not successful due to running out of time or memory, 
   1. then monitor Zuora batch jobs either via Zuora UI https://www.zuora.com/apps/BatchQuery.do or via API endpoints `GET /v1/batch-query/jobs/{{jobId}}` 
   1. ![image](https://user-images.githubusercontent.com/13835317/114559021-359b5600-9c63-11eb-9d1c-8974c066ddf6.png)
   1. once it completes, run the following app to copy over CSVs from zuora to ophan buckets https://github.com/guardian/support-service-lambdas/pull/769 
   1. csv files should be in ophan buckets, so run spark jobs via [airflow](https://zc6e7edd5b7c7cbb9p-tp.appspot.com/admin/airflow/graph?dag_id=supporter-experience) by clicking `Clear` on `zuora_account`. This should trigger all the children jobs as well as all zuora_* tables depend on zuora_account.

### Backbround regarding incrementalTime:

Export is **NOT** idempotent. Do not blindly re-run the export. Lake must ingest the latest increment before 
lambda can be executed again with `{"exportFromDate": "afterLastIncrement"}`. If the lambda is executed before
lake ingests the latest increment, then the increment is lost. (If this happens use `incrementalTime` method \
described below to retrieve the lost increment.) 

However it seems to be safe to re-run the export with `incrementalTime` provided. This will get the changes since
`incrementalTime` but it will not modify the session so when lambda runs again with `{"exportFromDate": "afterLastIncrement"}` 
it will pick up from the last time it ran:

* To manually re-run the export, pass date as string in the following format `"2019-01-20"` to export lambda. 
This will export changes since 2019-01-19.
* The export lambda is **idempotent** as long as `incrementalTime` is present.

| Load changes since...   |      lambda input                             |
|-------------------------|:---------------------------------------------:|
| Continue session        | `{"exportFromDate": "afterLastIncrement"}`    |
| Since particular date   | `{"exportFromDate": "2020-01-20"}`            |
| Since beginning of time | `{"exportFromDate": "beginning"}` DO NOT USE! |

If extracting via postman make sure to use the **exact same** `partner` and `project` values as in lambda.

## How does export work?

1. [Trigger lambda](https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#rules:)
2. [Zuora AQuA Stateful API](https://knowledgecenter.zuora.com/DC_Developers/AB_Aggregate_Query_API/BA_Stateless_and_Stateful_Modes#Automatic_Switch_Between_Full_Load_and_Incremental_Load)
3. [Export CSV of changes since yesterday](https://knowledgecenter.zuora.com/DC_Developers/AB_Aggregate_Query_API/B_Submit_Query/e_Post_Query_with_Retrieval_Time)
4. Save CSV to Datalake raw buckets `arn:aws:s3:::ophan-raw-zuora-increment*`
5. [Run Datalake Spark Job to create clean table](https://github.com/guardian/ophan-data-lake/tree/main/etl/subscriptions/src/main/scala/com/gu/datalake/etl/zuora)

Example exported CSV of changes:

```
Account.IsDeleted,Account.Balance,Account.AutoPay,Account.Currency,Account.Id,Account.IdentityId__c,Account.LastInvoiceDate,Account.sfContactId__c,Account.Mrr
false,0,true,GBP,2c92c0f8697096be016971cca2091243,30000311,2019-03-12,003g000001UtkrEAAR,25
false,0,true,AUD,2c92c0f8697096be016971cd69f7155c,30000311,2019-03-12,003g000001UtkrEAAR,25
false,0,true,USD,2c92c0f8697096be016971ebc60d7ff7,30000311,2019-03-12,003g000001UtkrEAAR,25
```

## How does Ophan job handle row updates and deletions?

Increment CSV always wins. When Ophan jobs loads the CSV file we add column `processedDate` which is used to determine the winner.
Zuora AQuA Stateful API exports the CSV with `IsDeleted` column which Ophan job filters on to remove deleted rows.

Pseudocode of Ophan job:
```
incrementDataset
    .union(existingDataset)
    .groupByKey(_.id)
    .reduceGroups((e1, e2) => if (e1.processedDate.after(e2.processedDate)) e1 else e2)
    .filter(_.isDeleted == false)
```

## How to add new fields in existing object?

1. Add fields to Zuora https://www.zuora.com/apps/CustomField.do
1. Add fields to support-service-lambda https://github.com/guardian/support-service-lambdas/pull/757
1. Add fields to ophan-data-lake https://github.com/guardian/ophan-data-lake/pull/5675
1. Run export lambda with input `{"exportFromDate": "afterLastIncrement"}` and let it fail (new fields will trigger full export so it will fail due to memory or timeout)
1. Copy over raw CSVs once Zuora export job succeeds https://github.com/guardian/support-service-lambdas/pull/769
1. Drop table in Athena `drop table clean.zuora_subscription`
1. Run spark jobs via [airflow](https://zc6e7edd5b7c7cbb9p-tp.appspot.com/admin/airflow/graph?dag_id=supporter-experience) by clicking `Clear` on `zuora_account`.
1. This should trigger all the children jobs as well.
1. Raise support ticket with data team asking for extra fields in Google BigQuery
1. Check new fields are available at https://console.cloud.google.com/bigquery?project=datatech-platform-prod

## How to get data from AWS Athena to Google BigQuery?

1. Currently, manual changes to schema are required so raise support ticket with data team asking for extra fields
1. To get clean S3 data into BQ, we have an airflow task that runs and uses Google Storage Transfer to copy the objects over to GCS buckets
1. We then have staging tables running directly over those GCS buckets
1. when DBT runs, it does a SELECT * on the staging table (unless it's partitioned) and then loads that data into 'native' tables in BigQuery storage. These are the tables in the `datalake` dataset

## How to add another object to export?

Example query object:

```scala
object AccountQuery extends Query(
  batchName = "Account",
  zoql = "SELECT Account.Balance,Account.AutoPay,Account.Currency,Account.ID,Account.IdentityId__c,Account.LastInvoiceDate,Account.sfContactId__c,Account.MRR FROM Account WHERE Status != 'Canceled' AND (ProcessingAdvice__c != 'DoNotProcess' OR ProcessingAdvice__c IS NULL)",
  s3Bucket = "ophan-raw-zuora-increment-account",
  s3Key = "Account.csv"
)
```

## How does it get triggered?

AWS Cloudwatch Event Rule triggers the export lambda once per day. Each execution exports changes 
since last time export ran. Rule passes `{"exportFromDate": "afterLastIncrement"}` to lambda.




## How to perform full export?

1. There is a separate app designed just for full export. Follow the readme of https://github.com/guardian/zuora-full-export
2. Manually upload big CSVs via [AWS CLI](https://github.com/guardian/zuora-full-export#upload-large-csv-files-to-raw-datalake-buckets)
3. Make sure to also upload corresponding metadata file with corresponding recordCount otherwise Datalake job pre-conditions validation might fail
    ```scala
    {
        "jobId": "2c92c0f9725046a2017255f7d84e5a48",
        "fileId": "2c92c09472503749017255fc3c9379c8",
        "batchId": "2c92c0f9725046a2017255f7d8925a55",
        "status": "completed",
        "name": "InvoiceItem",
        "recordCount": 48650
    }
    ```

WARNINGS:
* **Zuora is not capable of doing a full export of large objects due to 8 hours limitation on jobs: 
  https://support.zuora.com/hc/en-us/requests/186104** 
* Do **NOT** use `{"exportFromDate": "beginning"}` to achieve full export. Lambda will throw an exception if `beginning` 
input is provided. We did not remove it from the code on the off-chance one day Zuora will remove the 8 hour limitation
or speed up their exports.
* Any modification to the query (adding/removing/renaming fields or filters) will result in full export for that one 
object
* Changing the `project` fields from say `zuora-datalake-export-1` to `zuora-datalake-export-2` will result in full
export of all objects
* Note lambda has a hard timeout of 15 min, so if the export takes longer 
  - use postman, and manually copy the CSV file over to Ophan bucket. Make sure to use the **exact same** `partner` and `project` values as in lambda.
  - trigger the export via lambda and let it fail. Then manually copy the CSV files over to Ophan buckets.
* [Switch Between Full Load and Incremental Load](https://knowledgecenter.zuora.com/DC_Developers/AB_Aggregate_Query_API/BA_Stateless_and_Stateful_Modes#Automatic_Switch_Between_Full_Load_and_Incremental_Load)



## Which Zuora API User is used for extract?

There is a dedicated [OAuth client](https://knowledgecenter.zuora.com/CF_Users_and_Administrators/A_Administrator_Settings/Manage_Users#Create_an_OAuth_Client_for_a_User) for user `zuora-datalake-export`:

* [CODE](https://apisandbox.zuora.com/apps/UserLogin.do?method=view&id=2c92c0f869580afa01695cf6dba35141)
* [PROD](https://www.zuora.com/apps/UserLogin.do?method=view&id=2c92a00869767b1801698119c1103653)

## Job ID and File ID

On success we log:

```
2019-03-14 15:09:59,427 INFO - Successfully exported Account changes since 2019-03-13 00:00:00: 
Name: Account
Change size: Some(68)
Changes since: 2019-03-13 00:00:00
Target S3 bucket: s3://ophan-temp-schema/marioTest/raw/zuora/increment/Account.csv
Job ID: 2c92c0f8697a269a01697cc0b574079c
File ID: Some(2c92c094697a209f01697cc0b6c65f09)
```

Notice `Job ID` and `File ID` can be used to get more information via Postman.

## Get Job Results

```http request
GET /v1/batch-query/jobs/{{jobId}}
Host: rest.apisandbox.zuora.com
Accept: application/json
Content-Type: application/json
Authorization: Bearer ************
```

## Get CSV content
```http request
GET /apps/api/file/{{fileId}}
Host: apisandbox.zuora.com
Authorization: Bearer ***********
```

## View Jobs in Zuora UI

https://apisandbox.zuora.com/apps/BatchQuery.do

## Re-running an Airflow Job

Airflow orchestrates running the various jobs associated with the etl pipeline and datalake.

You can re-run the import of the output of this lambda once its has been written to s3 as follows:

### Logging into Airflow

The login for Aiflow is pretty broken to follow the instructions exactly:

* Navigate to [https://airflow.ophan.co.uk/login/](https://airflow.ophan.co.uk/login/)
* Click on the Google 'G'
* Click on the 'Sign In' button
* You will see a python error page but you are actually logged in
* Navigate to [https://airflow.ophan.co.uk/home](https://airflow.ophan.co.uk/home)

### Re-run an Airflow task instance

The ETL pipline/graph is split up into lots of separate tasks. You can re-run individual task to re-import specific 
files generated by the export lambda. There are however dependencies between the data in different files, eg 
subscriptions that reference accounts that dont exist in the datalake will be filtered out.

For this reason when resolving issues caused by failed exports it is probably safest to re-run the importation of 
all the exported files. 

The easiest way of doing this is by re-running the 'account' task and all of its dependencies as with a couple of 
exceptions is all of the imports. 

The following process describes how to do that, re-running additional/individual task can be done in a simialar way:  
* Click on 'DAGs' in the top bar
* Click on 'Supporter-experience'
* Click on 'Graph View'
* Find the 'zuora-account-1' task in the graph and click on it. Details of the Airflow configuration can be found here: 
[https://github.com/guardian/ophan-data-lake/tree/main/airflow](https://github.com/guardian/ophan-data-lake/tree/main/airflow) 
* Un-press the 'Downstream' and 'Recursive' buttons (all buttons next to 'Clear' should be pressed)
* Click on the 'Clear button'
* You will see a long list of task instances which are to be re-run. At this point its worth sanity checking this list
to double check what is going to happen is what you expect.
* Click 'OK!'
* The 'zuora-subscription-1' task and its dependencies should change colour displaying its state. You need to keep 
clicking on the refresh button in the top right of the graph view to see the changes.
* The state of the task seems to stay in 'up_for_reschedule' while the task is running. If you want to check if the 
spark job in running you can do so by looking at the EMR cluster
* * Log into the Aws console using the 'ETL job maintainer with access to Identity and Salesforce buckets' in 
[https://janus.gutools.co.uk/](https://janus.gutools.co.uk/)
* * Go to Services > EMR > Clusters
* * Click on the 'Zuora' cluster
* * The cluster should be running in which case you should be able to click on the stdout link which will give you 
some information on what the cluster is running









