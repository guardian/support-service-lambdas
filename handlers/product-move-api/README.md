# Product move api

## Introduction
This is an API, implemented by a lambda, to take a subscription ID for a contribution
and move the subscription to be a digital subscription.
It would be called from the backend, either manage-frontend or
possibly support-frontend for acquisition channel based switches.

The intention is to cancel the existing sub in zuora and replace it
with a fresh one in the same account.  There will also be a confirmation
email sent via membership-workflow.

Working doc here: https://docs.google.com/document/d/17_es85x-rVrS-ONmHUrX5lVS0bCcgk6ZxOkwvyCQ3xY/edit#heading=h.4hjwot4q08ip

## Testing

Here are instructions to test `move-product-CODE`, they were added when we did its secrets retrieval [PR](https://github.com/guardian/support-service-lambdas/pull/1957).

- Login to dev1 sandbox and go to: https://gnmtouchpoint--dev1.sandbox.lightning.force.com/lightning/r/SF_Subscription__c/a2F9E000007TFstUAG/view
- Click "Switch" in top right hand corner
- On first screen select the radio button in the "Select a Case" table then click "Next"
- product-move-api is called before the second screen loads (if it works then you'll see a nice table of information on the second screen)