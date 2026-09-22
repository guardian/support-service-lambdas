# identity-deletion-cleanup

When an Identity account is deleted, its numeric Identity ID can remain on
Salesforce Contacts and Zuora Accounts. This handler removes that stale link
while leaving the records themselves in place, so both systems retain their
existing audit history.

## Flow

1. A user deletes their account through Manage My Account.
2. Identity completes the account-deletion flow and publishes a `DELETE` event
   to its account-deletions SNS topic.
3. Identity subscribes this handler's SQS queue to that topic.
4. The Lambda processes each SQS record, then clears `IdentityID__c` from every
   matching Salesforce Contact and `IdentityId__c` from every matching Zuora
   Account.

No match in either system is a successful outcome. Multiple Salesforce Contacts
or Zuora Accounts for the same Identity ID are all updated.

Salesforce is limited to five Contacts and Zuora to fifty Accounts. The limits
protect against a query unexpectedly matching a broad set of records. The
message fails before any records are updated and is sent to the DLQ after its
retries. Check the query and the matching records manually; if the matches are
legitimate, clear them manually and raise the limit in a reviewed change if
needed.

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
in Secrets Manager; it is not application configuration. It is separate because
it belongs to the dedicated Salesforce Connected App and user for this Lambda,
and can be rotated independently. It reuses the standard Support Service Lambdas
Zuora OAuth secret.

## Event contract

The producer is Identity's [EventPublisher](https://github.com/guardian/identity/blob/4f09e19357f1bde61a967538ab9fb4a43bf30d5a/identity-api/src/main/scala/com/gu/identity/api/integration/sns/EventPublisher.scala#L70).
The SNS message contains a JSON event with a numeric `userId` and
`eventType: "DELETE"`. The handler rejects any other shape so SQS retries it and
then sends it to the DLQ.

## Testing

Run the automated tests with:

```bash
pnpm test
```

To exercise the real CODE Salesforce and Zuora dependencies locally, create
dedicated test records first and then run:

```bash
AWS_PROFILE=membership IDENTITY_ID=<numeric-test-identity-id> pnpm exec tsx runManual/cleanIdentityInCode.ts
```

This clears the matching IDs from both CODE systems, so it must only be used with
a dedicated test Identity ID.

For the end-to-end CODE test, create a non-Guardian-domain Identity test account,
add its numeric Identity ID to test records in Salesforce and Zuora, then delete
the Identity account through Manage My Account. Confirm both fields were cleared
and that the Lambda processed the queue message successfully.
