# zuora-sar

Zuora-sar consists of 2 lambdas, which work together to make Subject Access Requests to Zuora.
 
## ZuoraSarLambda 
The Zuora SAR Lambda is called from [Baton](https://github.com/guardian/baton) with two types of requests.
1. An **initiate** request generates a UUID, which is then used by Baton to make subsequent status checks, and triggers the ZuoraPerformSarLambda, which performs the requests to Zuora.
2. A **status** request makes calls to S3 to check if an object exists in the results bucket with a completed or failed path. Otherwise, if an object exists in the failed path, a Failed response is returned to Baton. If an object exists in the completed path, a Completed response is returned to Baton with the results location. If no object exists for a given ID in neither the completed path nor the failed path, then a Pending response is returned to Baton.

### ZuoraPerformSarLambda 
The ZuoraPerformSarLambda works as follows:
1. Retrieves all contacts associated with an email address
2. Iterates through each contact and obtains their account details (comprising of an account summary and account object) and writes this to a /pending path in S3.
3. Downloads all invoices for each contact associated with the given email address and writes each one to a /pending path in S3.
4. Copies all objects in /pending to /completed and writes a final 'NoResultsFoundForUser' or 'ResultsCompleted' object to S3. The ZuoraSarLambda status checks look for these objects to indicate a successful Subject Access Request.