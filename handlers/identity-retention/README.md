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


