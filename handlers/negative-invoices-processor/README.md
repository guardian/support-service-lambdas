# Negative Invoices Processor

## Purpose

Ensure any money owed to customers, represented as negative balances on invoices, are transferred to them either via a credit balance adjustment to their account, or a direct refund

## Infrastructure

Lambda functions orchestrated by a State Machine

## Notifications

- Error notifications sent to developers via google chat

## Process Flow

[Diagram](https://docs.google.com/drawings/d/1FDyLUv1NWBwglfstUrDveRpwBchWwt3zbWAV3G5SFsI/edit?usp=sharing)

## Notes

- We perform a check on the subscription status, because we are querying from the data lake, where subscription data gets updated once per day, and it is therefore possible for the subscription to go from active to cancelled in the time between the data uploading to the data lake and being queried by the lambda.

- It's very unlikely that a customer will have cancelled their subscription in the time that their data was uploaded to the data lake and the time the state machine executes. This means that the functionality to detect payment methods and perform refunds will rarely be used.

- If the State Machine is executed more than once in the same day, the same invoices will be picked up from the data lake. If a credit has already been applied to the account balance, it should not happen a second time, and an error should be thrown instead - the desired outcome.
