# stripe-disputes

This service handles Stripe dispute webhooks and manages the corresponding actions in Zuora and Salesforce when payment disputes are raised or resolved.

## Architecture

The service consists of two Lambda functions:
- **Producer Lambda**: Receives Stripe webhooks via API Gateway, validates signatures, and queues events to SQS
- **Consumer Lambda**: Processes queued events and performs business logic

## Webhook Processing

### Supported Events

The service processes two Stripe webhook events:
- `dispute.created` - When a dispute is first raised
- `dispute.closed` - When a dispute is resolved (lost, won, or warning closed)

### Dispute Created Flow

When a dispute is created:
1. Creates or updates a Salesforce Case record with dispute details
2. Links the case to the subscription and account

### Dispute Closed Flow

When a dispute is closed with status "lost":
1. Creates or updates the Salesforce Case with closure details
2. Rejects the payment in Zuora
3. Writes off the disputed invoice
4. Cancels the subscription
5. Sends a cancellation email to the customer via Braze

Disputes closed with other statuses (won, warning_closed) only update the Salesforce Case.

## Email Notifications

When a subscription is cancelled due to a lost dispute, the service sends an email notification through the Braze email queue. The email includes:
- Customer email address
- Subscription number
- Dispute creation date
- User's identity ID

The email will not be sent if the customer email address is missing from Zuora.

## Configuration

### Environment Variables
- `Stage`: CODE or PROD
- `DISPUTE_EVENTS_QUEUE_URL`: SQS queue URL for dispute events

### AWS Secrets
- `Stripe/ConnectedApp/StripeDisputeWebhooks`: Stripe webhook signing secret
- `Zuora-OAuth/SupportServiceLambdas`: Zuora OAuth credentials
- `Salesforce/ConnectedApp/StripeDisputeWebhooks`: Salesforce API credentials

## Testing

### Automated
`pnpm test`
### Manual (in CODE)
1. deploy to CODE
1. take out a sub with one of the "dispute" test cards https://docs.stripe.com/testing#disputes
1. go to stripe dashboard in test mode and accept the dispute
1. check the logs for the consumer and make sure no errors https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fstripe-disputes-consumer-CODE
1. log into dev1 salesforce, and check that the dispute is marked as "lost"
1. check in sandbox zuora and make sure the sub is cancelled, the payment is marked as refunded, and the invoice balance is zero
1. make sure you have had a dispute lost email from dev braze in your inbox.

## Monitoring

CloudWatch alarms monitor:
- Lambda error rates
- API Gateway 4XX/5XX errors
- SQS message age
- Dead letter queue messages

## Deployment

The service is deployed via riff-raff after the relevant build.
