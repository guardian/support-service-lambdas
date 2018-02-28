# zuora-auto-cancel
Contains three Scala lambdas behind the same API gateway:

**autoCancel**: 
Used to cancel subscriptions with overdue invoices, based on an event trigger within Zuora.

The full workflow is currently:
Zuora Callout > AWS CloudFront* > AWS API Gateway (Lambda Proxy Integration) > AWS Lambda

**paymentFailure**:
Used to trigger emails due to failed payment events in Zuora.

The full workflow is currently:
Zuora Callout > AWS CloudFront* > AWS API Gateway (Lambda Proxy Integration) > AWS Lambda > Exact Target / Marketing Cloud (which actually sends the emails).

**stripeCustomerSourceUpdated**: 
Used to automatically update a customer's payment method in Zuora so that the customer doesn't have to update their card details manually. 

Stripe works with card networks so that when a customer's card details are updated, this fires an event and we can provide an endpoint for Stripe to call.

The full workflow is currently:
Stripe Webhook > AWS Cloudfront > AWS API Gateway > AWS Lambda

*An additional CloudFront distribution is currently required because callouts do not support SNI, and the default CloudFront distribution (which gets set up in front of API Gateway) seems to require it.

# Testing

- Run `sbt test` to execute the unit tests
- If you need to validate that API Gateway can trigger Lambda execution successfully, deploy your changes to CODE and use Postman (or equivalent) to hit the API Gateway url with a valid payload.
- For a full integration test of the autoCancel or paymentFailure lambdas, you can trigger the callout from our UAT Zuora environment.
