# new-subscription-api

## Overview

An AWS Lambda that creates new Zuora subscriptions for Guardian products. It exposes a single endpoint:

```
POST /subscription
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

Send a `POST` request to the CODE endpoint, for instance with cURL:

```


curl --location 'https://new-subscription-api-code.support.guardianapis.com/subscription' \
--header 'Content-Type: application/json' \
--header 'x-api-key: [REPLACE_THIS_WITH_A_REAL_API_KEY]' \
--data-raw '{
    "accountName": "Test Account",
    "createdRequestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567899",
    "salesforceAccountId": "0011234567890ABCD",
    "salesforceContactId": "0031234567890ABCD",
    "identityId": "12345678",
    "currency": "GBP",
    "paymentGateway": "Stripe PaymentIntents GNM Membership",
    "existingPaymentMethod": {
        "id": "2c92c0f87568d97201756b1578b6069c",
        "requiresCloning": true
    },
    "billToContact": {
        "firstName": "John",
        "lastName": "Doe",
        "workEmail": "john.doe@example.com",
        "country": "GB"
    },
    "appliedPromotion": {
        "promoCode": "E2E_TEST_SPLUS_MONTHLY",
        "supportRegionId": "uk"
    },
    "productPurchase": {
        "product": "SupporterPlus",
        "ratePlan": "Monthly",
        "amount": 12
    }
}'
```

Check the CloudWatch logs for execution details:

```
/aws/lambda/new-subscription-api-CODE
```

## External Documentation

- [Zuora Orders API](https://developer.zuora.com/v1-api-reference/api/tag/Orders/)
- [Zuora Order Actions](https://developer.zuora.com/v1-api-reference/api/operation/POST_Order/)
