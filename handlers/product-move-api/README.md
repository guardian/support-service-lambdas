# Product move api

See below for the getting started

## Introduction
This is an API, implemented by a lambda, to take a subscription ID for a contribution
and move the subscription to be a digital subscription.
It would be called from the backend, either manage-frontend or
possibly support-frontend for acquisition channel based switches.

The intention is to cancel the existing sub in zuora and replace it
with a fresh one in the same account.  There will also be a confirmation
email sent via membership-workflow.

Working doc here: https://docs.google.com/document/d/17_es85x-rVrS-ONmHUrX5lVS0bCcgk6ZxOkwvyCQ3xY/edit#heading=h.4hjwot4q08ip

## Getting started
First follow the getting started instructions in the main README to get the whole project open in Intellij

Next for this lambda follow the specific instructions:

There are several options for testing depending on your needs
- "main" methods
- unit tests
- integration tests
- running in CODE

(TODO confirm these instructions are correct...there is also get-secrets-as-env-vars.sh which may cache the passwords for CODE locally)
To run main methods or integration tests locally, you need to have the AWS credentials.
1. make sure your .aws/config file contains
```
[profile membership]
region = eu-west-1
```
1. set Stage=CODE;EmailQueueName=braze-emails-CODE in the default configuration of Intellij for Application and JUnit
1. get Janus credentials for membership
1. Open the relevant class under the endpoint package in Intellij
1. press the green arrow to run the main method
1. The output should appear in the Intellij console, hopefully without errors.

## More detailed testing tips

Here are instructions to test `move-product-CODE`, they were added when we did its secrets retrieval [PR](https://github.com/guardian/support-service-lambdas/pull/1957).

- Login to dev1 sandbox and go to: https://gnmtouchpoint--dev1.sandbox.lightning.force.com/lightning/r/SF_Subscription__c/a2F9E000007TFstUAG/view
- Click "Switch" in top right hand corner
- On first screen select the radio button in the "Select a Case" table then click "Next"
- product-move-api is called before the second screen loads (if it works then you'll see a nice table of information on the second screen)
