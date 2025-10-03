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

Run tests from this directory:
```bash
npm test
```

## Monitoring

CloudWatch alarms monitor:
- Lambda error rates
- API Gateway 4XX/5XX errors
- SQS message age
- Dead letter queue messages

## Deployment

The service is deployed via CDK as part of the support-service-lambdas stack. See the root README for deployment instructions.