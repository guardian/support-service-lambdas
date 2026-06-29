# identity-backfill

This is a lambda to add identity accounts to zuora and salesforce where appropriate.

It is deployed as Membership Admin::Identity Backfill and this will do the cloudformation at the same time.
Use postman to post to https://{{identityBackfillCloudfrontStage}}/identity-backfill?apiToken={{apiToken}}

After updating Zuora and Salesforce, the lambda also publishes one `SupporterRatePlanItem` per active rate plan
to the `supporter-product-data-${Stage}` SQS queue. The consumer (in `guardian/support-frontend`) writes the
records into the `SupporterProductData-${Stage}` DynamoDB table that powers MMA and the digital entitlements,
so a renewal amendment in Zuora is no longer required to surface the subscription to the user.

If the SQS publish fails the API still returns success: Zuora and Salesforce remain the source of truth, and
the DynamoDB sync can be re-run with the `sync-supporter-product-data` script if needed.

See this google doc for notes and information.  Please edit the document and add to it.
https://docs.google.com/document/d/1YvwrVVNhoekwG00MRyjHe3gXiaOguQlHSXqzCniWP-w/edit?pli=1

Guide: 
https://docs.google.com/document/d/1ltS35rpep4BerfgVNIvgAS_NRrA84MxJ6ipprdp1I14/edit

Delinked Identity Accounts sheet:
https://docs.google.com/spreadsheets/d/1s5LFp4z4du77HFFyDnrrBk-QF19y4HCkeXQRHqiN_9I/edit#gid=0
