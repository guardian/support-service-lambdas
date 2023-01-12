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

## Testing

There's a few different levels of testing you can do with this project.
1. `scalatest` unit tests are in `src/test/scala` and a selection `Stub` classes are provided for mocking calls to REST endpoints etc.
2. Local testing against the Zuora DEV environment using AWS credentials.
3. Manually calling Lambdas in the CODE env.
4. Integration testing with Baton in the CODE env.

### Local Testing

`src/local` contains a test app `ZuoraRerLocalRun` which can be run from your DEV machine. 
It allows you to test the code against the Zuora DEV sandbox account.  
This is a much quicker develop/test cycle compared to deploying a branch to CODE.

### Lambda testing on CODE

Once you're happy with the local testing, push a branch to GitHub and TeamCity will build it.
Then in RiffRaff deploy the project `support-service-lambdas::zuora-rer` to CODE.

In the membership AWS account, search in the lambda console Functions list for the main lambda:
- `zuora-baton-rer-lambda-CODE`

Click into the function and go to the Test tab.  Hopefully there will be some test payloads already set up in there, but if not examples are:

```json
// initiate request for a non-existent email address
// on checking the status is should say Success with 'no results found'
{
  "subjectId": "",
  "subjectEmail": "invalid.email",
  "dataProvider": "zuorarer",
  "action": "initiate",
  "requestType": "RER"
}

// initiate should return 'Pending' status, so the following
// is used to check for completion
{
   "initiationReference": "<uuid returned by initiate response>",
   "action": "status",
   "requestType": "RER"
}

// initiate request for an actual email address
// on checking the status is should say Success or Failure
// depending on whether the account meets the deletion criteria
{
   "subjectId": "",
   "subjectEmail": "test@example.com",
   "dataProvider": "zuorarer",
   "action": "initiate",
   "requestType": "RER"
}

```

We shouldn't need to call the `zuora-baton-perform-rer-lambda-CODE` lambda directly, but you can make test calls in a similar way.