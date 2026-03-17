# createSubscriptionForExistingAccount

## Overview

Adds a new `createSubscriptionForExistingAccount` function to the `zuora` module. This function creates a new subscription on an **already-existing** Zuora account via the Orders API (`POST /v1/orders`), as opposed to `createSubscription` which creates a new account and subscription together.

The primary use case is adding a second (or subsequent) product subscription to an account that was originally created through a different flow.

## Files changed

### `modules/zuora/src/createSubscription/createSubscriptionForExistingAccount.ts` (new)

The main implementation. Accepts:

- `accountNumber` — the Zuora account key (human-readable like `A00081977`, or the internal hex ID — the function resolves the canonical account number via a `GET /v1/accounts/{accountNumber}` lookup before submitting the order)
- `productPurchase` — the product and rate plan to subscribe to, following the existing `ProductPurchase` schema
- `createdRequestId` — optional idempotency key, forwarded as the `idempotency-key` request header
- `appliedPromotion` — optional promotion to apply (sets `InitialPromotionCode__c` and `PromotionCode__c` custom fields and adds the discount rate plan override)
- `runBilling` / `collectPayment` — optional booleans, both default to `true`

The function:
1. Fetches `basicInfo.accountNumber` and `billingAndPayment.currency` from the existing account (zod-parsed to ensure type safety)
2. Resolves the product rate plan and any charge override from the product catalog
3. Builds a `CreateSubscription` order action using the shared `buildCreateSubscriptionOrderAction` helper
4. Submits the order via `executeOrderRequest` using `existingAccountNumber` (the Orders API variant for existing accounts)
5. Sets subscription custom fields: `LastPlanAddedDate__c`, `ReaderType__c: Direct`, and optionally `InitialPromotionCode__c` / `PromotionCode__c`

### `modules/zuora/src/createSubscription/createSubscription.ts` (modified)

Changed `const createSubscriptionResponseSchema` to `export const createSubscriptionResponseSchema` so it can be reused in the new file without duplication.

### `modules/zuora/src/index.ts` (modified)

Added `export * from './createSubscription/createSubscriptionForExistingAccount'` to expose the new function and its input type from the module's public API.

### `modules/zuora/test/createSubscriptionForExistingAccount.test.ts` (new)

Unit tests (5 cases) covering:

- Correct `GET /v1/accounts/{accountNumber}` lookup and use of the returned human-readable account number in the Orders API payload
- `createdRequestId` forwarded as `idempotency-key` header
- No idempotency header when `createdRequestId` is omitted
- Promotion custom fields (`InitialPromotionCode__c`, `PromotionCode__c`) set when `appliedPromotion` is provided
- `processingOptions` (`runBilling`, `collectPayment`) passed through correctly

### `modules/zuora/test/createSubscriptionForExistingAccountIntegration.test.ts` (new)

Integration test against the CODE Zuora environment (`@group integration`). The test:

1. Creates a fresh account with a `GoCardless` / `DirectDebit` payment method and an initial `GuardianAdLite Monthly` subscription (using `createSubscription`) — this avoids any dependency on pre-existing test accounts that may be stale or inactive
2. Calls `createSubscriptionForExistingAccount` with the returned account number to add a second `GuardianAdLite Monthly` subscription
3. Asserts the response `accountNumber` matches and exactly one new subscription number is returned

Both orders use `runBilling: false, collectPayment: false` to avoid triggering payment processing in CODE.

## Key design notes

- **Orders API `existingAccountNumber` requires the human-readable account number** (e.g. `A01108073`), not the internal hex ID (e.g. `2c92c0f8...`). The function always resolves this via the account GET, so callers can pass either format.
- All helpers (`getProductRatePlan`, `getChargeOverride`, `getSubscriptionDates`, `buildCreateSubscriptionOrderAction`, `executeOrderRequest`, `getPromotionInputFields`) are shared with `createSubscription.ts` — no new logic was introduced.
- All inputs and outputs are zod-validated, consistent with the existing patterns in this module.
