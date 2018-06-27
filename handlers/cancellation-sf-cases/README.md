# cancellation-sf-cases
Two lambda functions (under a single handler) [via API Gateway]...

- `cancellation-sf-cases-raise-` POST
- `cancellation-sf-cases-update-` PATCH

... for creating and updating SalesForce 'Cases', called during cancellation flow(s) within the 'manage' frontend. 


### Handling Multiple Environments
Unlike other lambdas in this project there exists **DEV** instance of each lambda in AWS, which picks up the DEV private config, thus  connecting to the cs85 DEV SalesForce instance.

**CODE** lambdas always connect to UAT Salesforce currently, which is not the behaviour of Members Data API (where it depends on the user)

**PROD** lamdas always connect to PROD Salesforce currently
