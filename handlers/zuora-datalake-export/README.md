# Zuora to Datalake incremental export

## How does export work?

1. [Trigger lambda](https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#rules:)
2. [Zuora AQuA Stateful API](https://knowledgecenter.zuora.com/DC_Developers/AB_Aggregate_Query_API/BA_Stateless_and_Stateful_Modes#Automatic_Switch_Between_Full_Load_and_Incremental_Load)
3. [Export CSV of changes since yesterday](https://knowledgecenter.zuora.com/DC_Developers/AB_Aggregate_Query_API/B_Submit_Query/e_Post_Query_with_Retrieval_Time)
4. Save CSV to Datalake raw buckets `arn:aws:s3:::ophan-raw-zuora-increment*`
5. [Run Datalake Spark Job to create clean table](https://github.com/guardian/ophan-data-lake/tree/master/etl/subscriptions/src/main/scala/com/gu/datalake/etl/zuora)

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

AWS Cloudwatch Event Rule triggers the export lambda once per day. Each execution exports changes since yesterday. 
For example, executing on 2019-01-20, will set `"incrementalTime": "2019-01-19 00:00:00"` in the body of AQuA request.

Passing `{"exportFromDate": "yesterday"}` to lambda will export changes since yesterday. 

## How do we know when it fails?

Cloudwatch Alert email is sent to SX mailing list.

## How to retry the export manually?

* To manually re-run the export, pass date as string in the following format `"2019-01-20"` to export lambda. 
This will export changes since 2019-01-19.
* The export lambda is **idempotent**. As long as `incrementalTime` is kept the same in the body of AQuA request, it 
can be re-run safely.
* Make sure to set the input date to lambda to the day on which the failure happened for the first time. 
For example, if the failure happened on 2019-01-19, but it was noticed for the first time a week later on 2019-01-26,
then input should be `2019-01-19`.

| Load changes since... |      lambda input                    |
|-----------------------|:------------------------------------:|
| Since yesterday       | `{"exportFromDate": "yesterday"}`    |
| Since particular date | `{"exportFromDate": "2020-01-20"}`   |
| Full load             | `{"exportFromDate": "beginning"}`    |

## How to extract a full load?

* Passing _beginning of unix time_, that is, `1970-01-01` will in effect represent full load
* Note lambda has a hard timeout of 15 min, so if the export takes longer that than, then use postman, and manually copy
the CSV file over to Ophan bucket. Make sure to use the exact same `partner` and `project` values as in lambda.
* [Switch Between Full Load and Incremental Load](https://knowledgecenter.zuora.com/DC_Developers/AB_Aggregate_Query_API/BA_Stateless_and_Stateful_Modes#Automatic_Switch_Between_Full_Load_and_Incremental_Load)

## Which Zuora API User is used for extract?

There is a dedicated [OAuth client](https://knowledgecenter.zuora.com/CF_Users_and_Administrators/A_Administrator_Settings/Manage_Users#Create_an_OAuth_Client_for_a_User) for user `zuora-datalake-export`:

* [DEV](https://apisandbox.zuora.com/apps/UserLogin.do?method=view&id=2c92c0f869580afa01695cf6dba35141)
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






