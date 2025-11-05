# Staff Access endpoint

This lambda is a frontend for google auth via AWS cognito.  It proxies requests to staff endpoints on discount api and
other lambdas, setting downstream and using upstream the relevant staff token cookie.

IMPORTANT: It is not intended at this stage to control anything sensitive, particularly it must not authenticate any
access to PII whatsoever!

- CODE https://staff-access-code.support.guardianapis.com/discount-api/docs
- PROD https://staff-access.support.guardianapis.com/discount-api/docs

## Adding google auth to a new endpoint


## Developing

Rotating google auth credentials needs access to the google developer console, they are under the "meeting-reminder-bot" (aka daily-churn-email) project.

https://console.cloud.google.com/auth/clients?project=daily-churn-email

Once rotated, they can be added to parameter store (in the usual place - for CODE under /CODE/support/staff-access)

The cognito client secret if changed needs manually adding to parameter store, due to security
limitations.

## TODO
- add tests
- tidy up "client"s to return sensible data types
- add some runManual for local/CODE where appropriate
- review for any security holes
- make sure nothing can be forwarded inappropriately by the proxy, e.g. the auth cookie to an untrusted backend
- check the cookie settings (secure, httponly)
- consider to add a neater fastly domain https://staff-access.guardianapis.com/discount-api/docs