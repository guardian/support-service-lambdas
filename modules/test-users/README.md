## Test Users
This module provides an easy way to create, cancel and delete test subscriptions and accounts in CODE Zuora from the command line.

Usage examples are below:
### Create a subscription
```shell
pnpm -filter test-users createSubscription
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
Check create.ts to see what type of sub has been created.
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