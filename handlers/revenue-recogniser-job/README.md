# DEV env cleaner

The revenue recognition job is needed because some subscriptions (Digital Subscription gifts)
have a manual revenue recognition rule set up.  This is so that revenue can be recognised
on redemption rather than on purchase.

Unfortunately this means that if a subscription is never redeemed, the revenue is never recognised.
Also, if a refund is made, the refund is not distributed.

The job will search for all subscriptions that need to be recognised, and distribute the schedules
as appropriate.

## Alarms

If the job fails, an alarm will be sent saying that there is an issue.

The accounts are not urgent so this does not need immediate investigation, a card can be planned in.
It will need fixing in due course so that it can catch up with any outstanding subscriptions.
