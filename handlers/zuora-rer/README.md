# zuora-rer

Zuora-rer consists of 2 lambdas, which work together to make Right to Erasure Requests to Zuora.
 
## ZuoraRerLambda 
The Zuora RER Lambda is called from [Baton](https://github.com/guardian/baton) with two types of requests.
1. An **initiate** request generates a UUID, which is then used by Baton to make subsequent status checks, and triggers the ZuoraPerformRerLambda, which performs the requests to Zuora.
2. A **status** request makes calls to S3 to check if an object exists in the results bucket with a /completed or /failed path. If an object exists in the /failed path, a Failed response is returned to Baton. If an object exists in the /completed path, a Completed response is returned to Baton. If no object exists for a given ID in neither the /completed path nor the /failed path, then a Pending response is returned to Baton.

### ZuoraPerformRerLambda 
The ZuoraPerformSarLambda works as follows:
1. Retrieves all contacts associated with an email address
2. Iterates through each contact and obtains their account details (comprising of an account summary and account object) and writes this to a /pending path in S3.
3. TBC
4. TBC