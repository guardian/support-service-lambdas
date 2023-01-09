# zuora-rer

Zuora-rer consists of 2 lambdas, which work together to make Right to Erasure Requests to Zuora.
 
## ZuoraRerLambda 
The Zuora RER Lambda is called from [Baton](https://github.com/guardian/baton) with two types of requests.
1. An **initiate** request generates a UUID, which is then used by Baton to make subsequent status checks, and triggers the ZuoraPerformRerLambda, which performs the requests to Zuora.
2. A **status** request makes calls to S3 to check if an object exists in the results bucket with a /completed or /failed path. If an object exists in the /failed path, a Failed response is returned to Baton. If an object exists in the /completed path, a Completed response is returned to Baton. If no object exists for a given ID in neither the /completed path nor the /failed path, then a Pending response is returned to Baton.

### Configuration
Environment-specific configurations are stored in S3 in the `membership` AWS account.

The path is `s3://gu-reader-revenue-private/membership/support-service-lambdas/<stage>/zuoraRer-<stage>.json`

Results are stored in the `baton` AWS account in the `gu-baton-results` bucket:

`s3://gu-baton-results/zuora-results/<stage>/<initiation-reference>/completed`

`s3://gu-baton-results/zuora-results/<stage>/<initiation-reference>/failed`

`s3://gu-baton-results/zuora-results/<stage>/<initiation-reference>/pending`

## ZuoraPerformRerLambda 
The ZuoraPerformRerLambda works as follows:
1. Retrieves all contacts and account id's associated with an email address
2. Checks that all accounts are ready for erasure (all subs cancelled, no outstanding balances)
3. Iterates through each account and:
   - scrubs personal data from the Account object
   - scrubs payment methods for the account
   - scrub personal data from Contacts
   - deleted Billing Documents

### Zuora Service Account Config

The lambda is configured to make API calls to Zuora using a service account specified for each STAGE in:
`s3://gu-reader-revenue-private/membership/support-service-lambdas/<stage>/zuoraRest-<stage>.json` 

The config specifies a baseUrl and then under a `batonZuora` object, a loginName and password.

The account should be set up in Zuora with the following roles:
- Zuora Platform Role: API User Role
- Billing Role: Billing - Right to Erasure
- Payments Role: Payments - Right to Erasure
- Finance Role: No Finance Permissions
- Commerce Role: No Commerce Permissions
- Reporting Role: No Reporting Permissions


The `Billing - Right to Erasure` role has the following permissions:
- Modify Account
- Delete Payment Methods
- Hard Delete Billing Document Files
- Scrub Sensitive Data Of Contact

The `Payments - Right to Erasure` role has the following permissions:
- Scrub Sensitive Date Of Specific Payment Method



