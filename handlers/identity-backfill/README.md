# identity-backfill

This is a lambda to add identity accounts to zuora and salesforce where appropriate.

It is deployed as Membership Admin::Identity Backfill and this will do the cloudformation at the same time.
Use postman to post to https://{{autoCancelCloudfrontStage}}/auto-cancel?apiToken={{apiToken}}