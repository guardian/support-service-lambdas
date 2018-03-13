# zuora-auto-cancel

This is actually the start of the reader rev lambda API repo possibly.  But it has a bad name so far. 

Please keep all the various README in this project up to date, and improve them!
There should be one in each project and anywhere else you think it's would help.

## philosophy
The general philosophy of this project is to keep things under review and don't be afraid to refactor things
especially the hard parts of the structure when you think they are wrong.
The PR review at the end will always let you know when people don't like the idea
but if you miss an opportunity to improve the structure, this hurts more in the long term than a good
change with poor naming.
Yes, small PRs are good, but that means small in terms of explanation, rather than small in terms
of lines touched.  If you split out some code into a separate subproject and rename an existing one,
that is a small change because I can explain it in one sentence.  Github's failings in terms
of displaying it concisely are not your failings in making it small!

Anything that isn't a line in the sand should be questioned and changed at will.
Anything that is should be questioned too.

## Guidelines in the sand (there should not be too many of these!)
- **good naming** - a good name promotes cohesion - it says more about what **shouldn't** be in the construct
than what should be.  If you have a catch all name like "common" or "helpers" in mind, think again.
- **effects separation** - to promote good reuse and testability, keep all side effects in one place, and only depend
on it from the top level handlers.  Effects should be minimal, and the top level handlers should mostly be wiring.
If there's any code in either that you feel could be unit tested, it should probably be in another project.
- **one jar per lambda** - minimise the size of the deployment artifact
- **minimise dependencies (aka liabilities)** on external libraries as we have to keep them up to date, also they increase the size of the artifact

## structure
The main project aggregates all the sub projects from handlers and lib, so we can build and test them in one go.

## root
Contains three Scala lambdas behind the same API gateway.  TODO These should be moved into a new set of 3 projects in the handlers folder.

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
