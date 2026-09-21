# identity-deletion-cleanup

When an Identity account is deleted, this handler clears the matching numeric
Identity ID from Salesforce Contacts and Zuora Accounts. It leaves the records
themselves in place, so both systems retain their existing audit history.

## Flow

1. Identity publishes a `DELETE` event to its account-deletions SNS topic.
2. Identity subscribes this handler's SQS queue to that topic.
3. The Lambda processes each SQS record, then clears `IdentityID__c` from every
   matching Salesforce Contact and `IdentityId__c` from every matching Zuora
   Account.

No match in either system is a successful outcome. Multiple Salesforce Contacts
or Zuora Accounts for the same Identity ID are all updated.

Each lookup is limited to ten matches. More than ten indicates an unexpected
data condition, so the message fails before any records are updated and can be
investigated from the DLQ.

## Configuration

The CloudFormation stack reads this non-sensitive SSM parameter:

| Key | Description |
| --- | --- |
| `identityMmaSnsDeletionRequestTopicArn` | The ARN of Identity's account-deletions SNS topic. It is stored at `/<STAGE>/support/identity-deletion-cleanup/identityMmaSnsDeletionRequestTopicArn` and is used to restrict the SQS queue policy to that topic. |

The Identity team owns the SNS subscription. On a first deployment or queue
recreation, ask them to subscribe the queue to the topic and confirm the
subscription message delivered to the queue.

The handler reads Salesforce OAuth credentials from Secrets Manager at
`<STAGE>/Salesforce/ConnectedApp/IdentityDeletionCleanup`. The credential stays
in Secrets Manager; it is not application configuration. It reuses the standard
Support Service Lambdas Zuora OAuth secret.

## Event contract

The producer is Identity's [EventPublisher](https://github.com/guardian/identity/blob/main/identity-api/src/main/scala/com/gu/identity/api/integration/sns/EventPublisher.scala).
The SNS message contains a JSON event with a numeric `userId` and
`eventType: "DELETE"`. The handler rejects any other shape so SQS retries it and
then sends it to the DLQ.

## Testing

Run the automated tests with:

```bash
pnpm test
```

For an end-to-end CODE test, create a non-Guardian-domain Identity test account,
add its numeric Identity ID to test records in Salesforce and Zuora, then delete
the Identity account through Manage My Account. Confirm both fields were cleared
and that the Lambda processed the queue message successfully.
