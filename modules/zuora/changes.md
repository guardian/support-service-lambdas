# cloneAccountWithSubscription

## Overview

Replaces the previous `cloneAccount` function (which used `POST /v1/accounts`) with a new `cloneAccountWithSubscription` function that creates a cloned account **and** an initial subscription in a single Zuora Orders API (`POST /v1/orders`) request.

The primary use case is creating a new account that shares the payment method of an existing account — for example when a customer switches product and needs a new billing account but should not be asked to re-enter payment details.

## How it works

The function accepts a `sourceAccountNumber` (the account to clone) and a `productPurchase` (the product and rate plan for the new subscription). It then:

1. Fetches account details from the source account — contacts, billing settings, Salesforce/identity IDs, payment gateway
2. Fetches payment method details and constructs a payment method payload that references the existing payment token (Stripe CCRT tokenId/secondTokenId, or PayPal BAID)
3. For delivery products, pulls `deliveryContact` and `deliveryInstructions` from the source account's `soldToContact` — callers only need to provide `firstDeliveryDate` (and `deliveryAgent` for NationalDelivery)
4. Submits a single Orders API request using `newAccount` (not `existingAccountNumber`), creating both the account and the subscription atomically

## Input

```typescript
type CloneAccountWithSubscriptionInput = {
  sourceAccountNumber: string;          // Account key or internal ID of the account to clone
  productPurchase: CloneAccountProductPurchase; // Product + rate plan; delivery-specific fields
                                               // (deliveryContact, deliveryInstructions) are
                                               // sourced from the account, not the caller
  createdRequestId?: string;            // Idempotency key
  appliedPromotion?: AppliedPromotion;
  runBilling?: boolean;                 // defaults to true
  collectPayment?: boolean;             // defaults to true
};
```

`CloneAccountProductPurchase` is a distributive omit of `deliveryContact` and `deliveryInstructions` from the `ProductPurchase` union, so TypeScript enforces that callers do not provide those fields.

## What is copied from the source account

- Account name, `crmId`, `sfContactId__c`, `IdentityId__c`, `batch`, `salesRep`, `autoPay`
- `billToContact` (full address)
- `soldToContact` (including `SpecialDeliveryInstructions__c`) — used as the delivery contact for delivery products
- `currency`, `paymentGateway`
- Default payment method token reference (CreditCardReferenceTransaction, PayPal, or BankTransfer/GoCardless mandate)

## Files changed

### `modules/zuora/src/createSubscription/cloneAccountWithSubscription.ts` (new)

Main implementation. Contains:
- `cloneAccountWithSubscription` — the exported function
- `CloneAccountWithSubscriptionInput` / `CloneAccountProductPurchase` — exported input types
- `buildPaymentMethodPayload` — reads the source account's default payment method and builds the Orders API payment payload (CreditCardReferenceTransaction or PayPal). BankTransfer uses a separate two-step approach (see below).
- Zod schemas (`sourceAccountSchema`, `sourceContactSchema`, etc.) for parsing only the fields needed from the source account — system fields are automatically excluded by Zod's strict parsing
- `toOrdersApiContact` — maps `zipCode` (returned by `GET /v1/accounts`) to `postalCode` (required by the Orders API)

### `modules/zuora/src/account.ts` (modified)

Removed `cloneAccount` and all associated helpers (`buildPaymentMethodPayload`, stripping helpers). Only `getAccount`, `deleteAccount`, and `updateAccount` remain.

### `modules/zuora/src/index.ts` (modified)

Exports `cloneAccountWithSubscription` (and its input types) in place of the removed `cloneAccount`.

### `modules/zuora/src/createSubscription/createSubscription.ts` (modified)

`createSubscriptionResponseSchema` changed from `const` to `export const` so it can be reused in `cloneAccountWithSubscription.ts`.

### `modules/zuora/test/cloneAccountWithSubscription.test.ts` (new)

Unit tests covering:
- Orders API called with `newAccount` (not `existingAccountNumber`)
- `crmId`, `sfContactId__c`, `IdentityId__c` copied from source account
- `zipCode` → `postalCode` mapping on `billToContact`
- `soldToContact` (with delivery instructions) set from source account's `soldToContact`
- BankTransfer (GoCardless) two-step flow verified
- `createdRequestId` forwarded as `idempotency-key` header
- Promotion custom fields set correctly

### `modules/zuora/test/cloneAccountWithSubscriptionIntegration.test.ts` (new)

Integration tests against the CODE Zuora environment (`@group integration`). Tests CCRT, PayPal, and BankTransfer (GoCardless) account cloning with cleanup (`deleteAccount` in `afterEach`).

## Implementation notes

### BankTransfer (GoCardless)

Cloning BankTransfer accounts uses a two-step approach because passing `mandateInfo.mandateId` in the Orders API `newAccount.paymentMethod` payload fails — the Orders API creates a new GoCardless customer for each new account, and GoCardless mandates are tied to the original customer, causing a `Mandate not found` error when billing is attempted.

Instead:
1. The Orders API creates the new account and subscription without a payment method (`autoPay: false`, `runBilling: false`).
2. `POST /v1/payment-methods` attaches the existing mandate to the already-created account (no new GoCardless customer is created in this path).
3. `PUT /v1/accounts/{id}` sets the new payment method as default and restores `autoPay: true`.
4. If `runBilling: true`, `POST /v1/accounts/{id}/billing-documents/generate` with `autoPost: true` generates, posts, and triggers payment collection for the new invoice.

## How to test

Unit tests:
```
pnpm test --testPathPattern=cloneAccountWithSubscription
```

Integration tests (requires CODE credentials):
```
NODE_OPTIONS=--experimental-vm-modules pnpm it-test --testPathPattern=cloneAccountWithSubscriptionIntegration
```
