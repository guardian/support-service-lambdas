# new-subscription-api

## Overview

An AWS Lambda that creates new Zuora subscriptions for Guardian products. It exposes a single endpoint:

```
POST /subscriptions
```

On receiving a request it:
1. Validates the request body (product/rate plan, payment method, contact details, optional promo code) using Zod.
2. Fetches the product catalogue.
3. Optionally fetches and applies a promotion.
4. Calls the Zuora Orders API to create the subscription.

Supported payment methods: Credit/Debit card (`CreditCardReferenceTransaction`), Direct Debit (`Bacs`), PayPal (`PayPalNativeEC`).

Supported currencies: GBP, EUR, AUD, USD, CAD, NZD.

## How to Test

### Unit tests

```bash
pnpm test
```

### Integration tests

Runs against the CODE environment and makes real Zuora API calls. Requires AWS credentials with access to CODE.

```bash
pnpm it-test
```

### Manual testing

Send a `POST` request to the CODE endpoint:

```
https://new-subscription-api-code.support.guardianapis.com/subscriptions
```

Check the CloudWatch logs for execution details:

```
/aws/lambda/new-subscription-api-CODE
```

## External Documentation

- [Zuora Orders API](https://developer.zuora.com/v1-api-reference/api/tag/Orders/)
- [Zuora Order Actions](https://developer.zuora.com/v1-api-reference/api/operation/POST_Order/)
