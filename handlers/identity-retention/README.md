# identity-retention

This lambda is used to look up an identity user's status to determine whether they have a recurring paying relationship with The Guardian. 

It is called by the following [Step Function](https://github.com/guardian/identity-account-deletion), and the response forms part of the decision
about whether a user's identity account can be deleted or not.

## Request format

The Lambda is called via API Gateway, see `identity-retention-api-PROD` and `identity-retention-api-CODE` in the `membership` account.

`GET <api gateway root>/retention-status?identityId=<id>`

## Response format

The response, which is json, will be one of the four following cases:

### 1. ongoing relationship - RETAIN
Status: `200`

Body:
```json
{
  "ongoingRelationship" : true,
  "relationshipEndDate" : "2024-01-01",
  "effectiveDeletionDate" : "2031-01-01",
  "responseValidUntil" : "2023-08-31"
}
```
The user has at least one active, ongoing relationship; `ongoingRelationship = true`

The user should be retained and the `requestValidUntil` field indicates when to check the status again.

### 2. lapsed relationship - RETAIN
Status: `200`

Body:
```json
{
  "ongoingRelationship" : false,
  "relationshipEndDate" : "2024-01-01",
  "effectiveDeletionDate" : "2031-01-01",
  "responseValidUntil" : "2023-08-31"
}
```
The user has one or more relationships that are no longer active but still within the seven year retention period.  

If `ongoingRelationship = false` and the `effectiveDeletionDate` is in the future, the user should be retained and the `requestValidUntil` field indicates when to check the status again.

### 3. lapsed relationship - DELETE
Status: `200`

Body:
```json
{
  "ongoingRelationship" : false,
  "relationshipEndDate" : "2015-01-01",
  "effectiveDeletionDate" : "2022-01-01",
  "responseValidUntil" : "2023-08-31"
}
```
The user has one or more relationships that are no longer active and all are now outside the seven year retention period.  

If `ongoingRelationship = false` and the `effectiveDeletionDate` is today or in the past, the user can be deleted.

### 4. identity not found - DELETE
Status: `404`

Body:
```json
{
  "message" : "User has no active relationships"
}
```
The user has no recorded active or lapsed relationships. 

The user can be deleted.


## Architecture/Components

The lambda is a typical `support-service-lambdas` lambda.  

Configuration is in `bigQuery-<env>.json` in the standard place in S3.

The lambda depends on a library `google-bigquery` (also in this repo) which provides a general wrapper for querying BQ based on the above config.

The SQL in the lambda queries a custom table `supporter_revenue_engine.identity_product_retention` which is generated 
by a dbt model which runs daily to bring together different types of paying relationship.

So any changes to the business logic of what is a paying relationship should be made in the dbt model here: https://github.com/guardian/data-platform-models/blob/10479a7290cc6803f3ffdc47341cc97f50bae68b/dbt/models/supporter_revenue_engine/identity_product_retention.sql

Data Design team can help you with this.

The service accounts that call BigQuery and permissions for the `supporter_revenue_engine` dataset are defined in Data Tech's `gcp-iac-terraform` repo: https://github.com/guardian/gcp-iac-terraform/tree/main/tf-cicd

Data Tech team can help you with this.