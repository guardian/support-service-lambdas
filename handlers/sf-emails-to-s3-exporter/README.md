# SF Emails to S3 Exporter

#### Related Documentation
[Shared Google Drive Folder: Sf Emails to S3](https://drive.google.com/drive/folders/1vSEIsatZ3DA3YQwGq0my8Gg5byDmTiOj?usp=sharing)

#### Related PRs
- [Salesforce](https://github.com/guardian/salesforce/pulls?q=label%3A%22Emails+to+S3%22)
- [AWS](https://github.com/guardian/support-service-lambdas/pulls?q=label%3A%22Emails+to+S3%22+)

## Description
Performs 3 high level Operations:

1. Exports emails from Salesforce to S3 ([Lambda](https://eu-west-1.console.aws.amazon.com/lambda/home?region=eu-west-1#/functions/export-emails-from-sf-to-s3-PROD?tab=monitoring), [Handler](https://github.com/guardian/support-service-lambdas/blob/main/handlers/sf-emails-to-s3-exporter/src/main/scala/com/gu/sf_emails_to_s3_exporter/Handler.scala))
2. Imports emails from S3 back into Salesforce ([API Gateway](https://eu-west-1.console.aws.amazon.com/apigateway/home?region=eu-west-1#/apis/0gtc3s8dj8/resources/btpon2gw75) - [GET](https://eu-west-1.console.aws.amazon.com/apigateway/home?region=eu-west-1#/apis/0gtc3s8dj8/resources/zreeh2/methods/GET))
3. Deletes emails in S3 ([API Gateway](https://eu-west-1.console.aws.amazon.com/apigateway/home?region=eu-west-1#/apis/0gtc3s8dj8/resources/btpon2gw75) - [POST](https://eu-west-1.console.aws.amazon.com/apigateway/home?region=eu-west-1#/apis/0gtc3s8dj8/resources/u147ua/methods/POST))

## Operations
1. Exports emails from Salesforce to S3 (Lambda) [Diagram](https://docs.google.com/drawings/d/197oBtt4WTpiGfka4bDgKd4aEzKQ9du_IXXF5HW--yp0/edit?usp=sharing)
    - Queries for a maximum of 2000 Email Ids from the Async Process Records object in SF
    - Groups the emails Ids into batches of 200
    - For each group of 200 ids
        - Delete associated Async Process Records
        - Query Salesforce for 200 email records
        - For each email in the recordset
            - add the email contents to the Parent Case file in S3
        - Writeback to Salesforce to indicate a successful exports
        
2. Imports emails from S3 back into Salesforce (API Gateway - GET)
    - Initiated via the UI in Salesforce by a User who wishes to view or act upon any emails that have been previously exported to S3
    - Returns the contents of all emails for a given case number in the response body

3. Deletes emails in S3 (API Gateway - POST)
    - Uses a path override to Delete Multiple Objects in S3 https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjects.html
    - Can be initiated by a variety of actions in Salesforce:
        - Emails have been reimported
        - Processing Data Subject Request for Erasure
        - A Case is deleted
        - Email Deletion when the emails are over 18 months old

## Metrics
- [failed_to_authenticate_with_sf](#metricfailed_to_authenticate_with_sf)
- [failed_to_get_records_from_sf](#metricfailed_to_get_records_from_sf)
- [failed_s3_get_file](#metricfailed_s3_check_file_exists)
- [failed_s3_check_file_exists](#metricfailed_s3_check_file_exists)
- [failed_s3_write_file](#metricfailed_s3_write_file)
- [failed_writeback_request_to_sf](#metricfailed_writeback_request_to_sf)
- [failed_writeback_to_sf_record](#metricfailed_writeback_to_sf_record)

## Troubleshooting

### Metric:failed_to_authenticate_with_sf

#### Description
The user credentials associated with the Lambda do not return a bearer token needed to query for records. 
No records are retrievable without a bearer token. 
#### Impact
Emails will accrue in Salesforce.
#### Potential Root Causes and Fixes
##### Root Cause
Running user is inactive or credentials expired
##### Fix
Inspect the credentials associated with the running user and verify that the user is active.

---

### Metric:failed_to_get_records_from_sf
#### Impact
Emails will accrue in Salesforce
#### Potential Root Causes and Fixes
##### Root Cause
Running user does not have access to a field in one of the Salesforce queries
##### Fix
Apply read permission to running user via permission set or profile
##### Root Cause
API version is deprecated
##### Fix
Update api version in Lambda environment variable
##### Root Cause
Read time out
##### Fix
Try running the query in postman to determine time taken to return results. Optimise query if needed. Can also try just running the lambda again as once in a while a time out may occur.
### Metric
failed_s3_get_file
#### Impact
Emails will accrue in Salesforce
#### Potential Root Causes and Fixes
##### Root Cause
Permissions issue for the Account and related S3 bucket
##### Fix
Ensure the Lambda has permissions to get files in S3 bucket

---
### Metric:failed_s3_check_file_exists
#### Description  
The lambda will check to see if a file with name matching case number exists in S3. If 
it does not exist, the lambda will create the file
#### Impact
Could result in duplicate files being created in S3
#### Potential Root Causes and Fixes
##### Root Cause
Permissions issue for the Account and related S3 bucket
##### Fix
Ensure the Lambda has permissions to list files in S3 bucket

---
### Metric:failed_s3_write_file
#### Impact
Emails will not be saved to S3 and will accrue in Salesforce
#### Potential Root Causes and Fixes
##### Root Cause
Permissions issue for the Account and related S3 bucket
##### Fix
Ensure the Lambda has permissions to put files in S3 bucket

---
### Metric:failed_writeback_request_to_sf
#### Description
The composite request to update multiple email records to indicate a successful export fails, so none of the records in the request body will be updated.
#### Impact
   - If persistent, emails will accrue in Salesforce. 
   - If sporadic, emails should be picked up in subsequent runs of the exporter
#### Potential Root Causes and Fixes
##### Root Cause
Running user does not have access to a field in the request body
##### Fix
Apply edit permissions to running user via permission set or profile
##### Root Cause
API version is deprecated
##### Fix
Update api version in environment variable
##### Root Cause
Read time out
##### Fix
Try running the query in postman to determine time taken to return results. Optimise query if needed. Can also try just running the lambda again as once in a while a time out may occur.

---
### Metric:failed_writeback_to_sf_record
#### Description
   - An individual record update from the composite request has failed. 
   - An email has been saved to S3 but the success of the operation has not been written back to the record in Salesforce.
#### Impact
Dependent on the reason for the error.
#### Potential Root Causes and Fixes
#### Root Cause
Record has been deleted in Salesforce
#### Fix
Depending on the reason the record was deleted in Salesforce, it may be necessary to delete the email content in the relevant file in S3

---
