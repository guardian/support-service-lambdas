# Staff Access endpoint

This lambda is a frontend for google auth via AWS cognito.  It proxies requests to staff endpoints on discount api and
other lambdas, setting downstream and using upstream the relevant staff token cookie.

IMPORTANT: It is not intended at this stage to control anything sensitive, particularly it must not authenticate any
access to PII whatsoever!

- CODE https://staff-access-code.support.guardianapis.com/discount-api/docs
- PROD https://staff-access.support.guardianapis.com/discount-api/docs

## Quick start - adding google auth to a new endpoint

1. Open your CDK, and check that you are using SrApiLambda
1. add the following line: `lambda.addStaffPath('<endpoint>');`
1. push and deploy (or run `pnpm update-stack` to update CODE directly)

Once you deploy it, that path will use google auth instead of an API key.
Access would be via the above form of URL for CODE and PROD.

For example, if your endpoint was `show-status`, the underlying url might be

- CODE https://dummy-lambda-code.support.guardianapis.com/show-status
- PROD https://dummy-lambda.support.guardianapis.com/show-status

If you access it directly, you would get an unauthorised error.  You would access it via

- CODE https://staff-access-code.support.guardianapis.com/dummy-lambda/show-status
- PROD https://staff-access.support.guardianapis.com/dummy-lambda/show-status

which would manage your cookie and login status accordingly.

## Developing

### How to test

Since this is a thin google oauth wrapper with few dependencies, there are few tests and manual runners.
The recommended way to test is to run `pnpm update-stack` and `pnpm update-lambda` as needed, then try it in CODE.

### Rotating credentials

Rotating google auth credentials needs access to the google developer console, they are under the "meeting-reminder-bot" (aka daily-churn-email) project.

https://console.cloud.google.com/auth/clients?project=daily-churn-email

Once rotated, they can be added to parameter store (in the usual place - for CODE under /CODE/support/staff-access)

The cognito client secret if changed needs manually adding to parameter store, due to security
limitations.

## TODO (in later PRs)
- consider to add a neater fastly domain https://staff-access.guardianapis.com/discount-api/docs
- some kind of index so we can find all the endpoints
- make the google client secret a securestring if possible (not easy as it's needed in the CFN)
- serve protected swagger UIs for each lambda (consider adding scopes (access-token) instead of using the id token)
- let people log out/clear the cookie