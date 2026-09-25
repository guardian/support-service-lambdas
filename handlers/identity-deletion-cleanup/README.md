# identity-deletion-cleanup

When an Identity account is deleted, its numeric Identity ID can remain on
Salesforce Contacts and Zuora Accounts. If that customer returns with a new
Identity account, Salesforce can contain contacts with the same email but
different Identity IDs. Email-based integrations, such as incoming customer
service emails, can then match the wrong contact. This handler removes the stale
Identity link while leaving both records in place.

## Flow

1. A user deletes their account through Manage My Account, or Userhelp deletes
   it through [User Admin](https://useradmin.gutools.co.uk/). Most deletions are
   self-service. The [Help Centre article](https://help.theguardian.com/article/how-do-i-delete-my-account)
   describes the user flow.
2. Identity completes the account-deletion flow and publishes a `DELETE` event
   to its account-deletions SNS topic.
3. Identity subscribes this handler's SQS queue to that topic.
4. The Lambda processes each SQS record, then clears `IdentityID__c` from every
   matching Salesforce Contact and `IdentityId__c` from every matching Zuora
   Account.

No match in either system is a successful outcome. The Salesforce Identity ID
field is unique, so an Identity ID should match at most one Contact. Zuora can
have multiple Accounts per Identity ID, one per subscription.

The lookups allow at most one Salesforce Contact and fifty Zuora Accounts. The
Zuora limit is a safety guard against a query unexpectedly matching too many
records; several hundred customers have more than ten Zuora Accounts, while
only five have more than fifty. Both systems are looked up and checked before
either is updated. If a limit is exceeded, the message retries and eventually
reaches the DLQ without updating either system. Check the query and matches
manually; clear legitimate matches manually, and raise the limit in a reviewed
change if needed.

Baton retrieves and erases Zuora data by email, so clearing the old Identity ID
does not prevent its deletion process and keeps Zuora data cleaner.

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

For the end-to-end CODE test, create an Identity test account using a
non-Guardian email address. Guardian email addresses may be blocked from
deletion in MMA because of staff subscriptions. An `@gutools.co.uk` address can
be used instead. Add its numeric Identity ID to test records in Salesforce and
Zuora, then delete the Identity account through Manage My Account. Confirm both
fields were cleared and that the Lambda processed the queue message
successfully.
