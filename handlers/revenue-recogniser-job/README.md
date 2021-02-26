# Revenue recognition job

The revenue recognition job is needed because some subscriptions (Digital Subscription gifts)
have a manual revenue recognition rule set up.  This is so that revenue can be recognised
on redemption rather than on purchase.

Unfortunately this means that if a subscription is never redeemed, the revenue is never recognised.
Also, if a refund is made, the refund is not distributed.

The job will search for all subscriptions that need to be recognised, and distribute the schedules
as appropriate.

## Testing

This is not possible to test with an EffectsTest as when you create a subscription, the revenue
schedules are not created immediately by zuora.  This means you can't distribute them without
polling them and waiting a while. (seems to be seconds in DEV, but minutes in PROD)

As a result, there is a HandlerManualTest file which has one App to create a DEV test sub, and one
to run the lambda in DEV.  Run one and then the other to see if it's working right.

## Alarms

If the job fails, an alarm will be sent saying that there is an issue.

The accounts are not urgent so this does not need immediate investigation, a card can be planned in.
It will need fixing in due course so that it can catch up with any outstanding subscriptions.
