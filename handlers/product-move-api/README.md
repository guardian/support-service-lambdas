# Product move api
This is a lambda API to take a subscription ID for a contribution
and move the subscription to be a digital subscription.
It would be called from the backend, either manage-frontend or
possibly support-frontend for acquisition channel based switches.

The intention is to cancel the existing sub in zuora and replace it
with a fresh one in the same account.  There will also be a confirmation
email sent via membership-workflow.

Working doc here: https://docs.google.com/document/d/17_es85x-rVrS-ONmHUrX5lVS0bCcgk6ZxOkwvyCQ3xY/edit#heading=h.4hjwot4q08ip
