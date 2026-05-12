# observer-benefits-api

An API which advises Tortoise Media systems that a user has an active “Observer” or “Blended” Guardian subscription.

POST /is-active
Request : {SubscriptionId: subscriptionNumber, postCode: ukPostcode}
Response : {active: boolean, renews: isoDate}

# How has this change been tested?

POST : https://observer-benefits-api-code.support.guardianapis.com/is-active
BODY : { "subscriptionId": "A-S01098933", "postCode": "N1 9GU"}

Note:
This api authenticates using an x-api-key within the header and requires generating/supplying.
The token can be found under AWS API GateWay/API Keys (observer-benefits-api-CODE/PROD).

# How can we measure success?

Found: Response 200
{
"isActive": true,
"renews": "2027-05-07T00:00:00.000Z"
}
Not Found: Response 200
{
"isActive": false
}

# Getting started

First follow the instructions in the root readme to brew install pnpm and run pnpm install

Then you can run `pnpm test` and `pnpm it-test` from this directory.
