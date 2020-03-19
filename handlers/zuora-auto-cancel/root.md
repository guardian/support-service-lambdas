This refers to the monolithic code in the main src folders in the root of the project.  These will be moved to this subdir in future.

## root
Contains three Scala lambdas behind the same API gateway.
At present these can be deployed to CODE and PROD as MemSub::Membership Admin::Zuora Auto Cancel.

Testing: to get all the emails from ET, run the EmailClientSystemTest against your own email address.  You should get a deluge of emails.

TODO These three lambdas should be moved into a new set of 3 projects in the handlers folder.

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

*An additional CloudFront distribution is currently required because zuora callouts do not support SNI, and the default CloudFront distribution (which gets set up in front of API Gateway) seems to require it.
