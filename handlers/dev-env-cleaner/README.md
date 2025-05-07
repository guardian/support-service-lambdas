# CODE env cleaner

The dev env cleaner is needed because we only have 200MB storage in the SalesForce Code environment

Since we have z360 sync set up, it creates a lot of objects in SF.  When we run the IT tests it creates a load of object
in zuora CODE.  The support IT and end to end tests are run on a very regular schedule (hourly).

This is designed to query for all subs and accounts created by IT tests and e2e tests and cancel both the subscriptions and accounts.
Once they are cancelled, the sync will remove them from SF therefore freeing up the space.

It then deletes the account from zuora completely.