# zuora-auto-cancel

This is the reader revenue lambda API/orchestration layer.  But it has a bad name so far - TODO fix this. 

Please keep all the various README in this project up to date, and improve them!
There should be one in each project and anywhere else you think it's would help.

---

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

---

## Quality matters
The testing story is not perfect at the moment!  You are responsible for getting your own changes into production safely.  However there are a few common situations you will encounter:

### code only changes
You can be confident when making code only changes.  Run `sbt test`. They will run on your build of your branch and when you merge to master.  Don't forget to "Run with Coverage" in IntelliJ.

### changes to config
The system won't safe you for free here.  Once you changed your config (see the howto below), you should run ConfigLoaderSystemTest.  This test does not (YET!) run automatically, so if you deploy to PROD without checking this, the lambdas will deploy but not actually work.

### system integration points
Traiditonal health checking doesn't happen.  After deploy you can't relax until you know an HTTP request will hit your lambda, and that your lambda can access any external services.
You can run the health check as a local test by downloading the DEV config, and running HealthCheckSystemTest.
You can run it in CODE and PROD by downloading the health check config from DEV and running CODEPRODHealthCheck.
The CODE and PROD health checks are called by RunScope every 5 minutes.

To download the dev config use the following command:
`aws s3 cp s3://gu-reader-revenue-private/membership/payment-failure-lambdas/DEV/ /etc/gu/ --exclude "*" --include "payment-failure-*" --profile membership --recursive`

---

## Howto update config
At the moment we just use S3 for config.

If you're making an addition, you can just copy the file from S3 for PROD and CODE, then update and upload.
Check the version in the AwsS3.scala ConfigLoad object.
`aws s3 cp s3://gu-reader-revenue-private/membership/payment-failure-lambdas/CODE/payment-failure-lambdas.private.v<VERSION>.json /etc/gu/CODE/ --profile membership`
Then do the reverse to upload again.

If you're making a change that you only want to go live on deployment (and have the ability to roll back
with riffraff) then you can increment the version.  Make sure you upload the file with the new version,
otherwise it will break the existing lambda immediately.

Follow the same process to update the prod config.

To check that you have done it correctly, run the ConfigLoaderSystemTest.
You will have to remove the @Ignore from it before you can run it.  Remember to replace afterwards.
That will check the latest version can be understood by the current version of the code.

Ideally this test should be automated and your PR shouldn't be mergable until the config is readable.

---

## structure
The main project aggregates all the sub projects from handlers and lib, so we can build and test them in one go.

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

**Identity backfill**

[identity-backfill](handlers/)

**Libraries**

[shared code](lib/)
