## Test Users
This module provides an easy way to create, cancel and delete test subscriptions and accounts in CODE Zuora from the command line. You will need to have fresh Janus credentials.

Usage examples are below:
### Create a Digital Subscription
```shell
pnpm --filter test-users createDigitalSubscription
```
Result will be: 
```json
[
  {
    Success: true,
    SubscriptionNumber: 'A-S00815422',
    AccountNumber: 'A00826604'
  }
]
```
This will create a monthly digital subscription
### Create a monthly recurring contribution
```shell
pnpm --filter test-users createMonthlyContribution 5
```
This will create a recurring contribution of £5/month
### Create an annual recurring contribution
```shell
pnpm --filter test-users createAnnualContribution 50
```
This will create a recurring contribution of £50/year
### Update contribution amount 
```shell
pnpm --filter test-users updateContributionAmount A-S00875272 9
```
This will update the contribution amount of the existing contribution with subscription number A-S00875272 to £9/billing period (this could be annual or monthly)
### Cancel a subscription
```shell
pnpm -filter test-users cancelSubscription A-S00815422
```
Result will be:
```json
{ success: true }
```

### Delete an account
```shell
pnpm -filter test-users deleteAccount A00826604
```
Result will be:
```json
{ success: true }
```