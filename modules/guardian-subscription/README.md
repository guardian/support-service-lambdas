# Guardian Subscription Parser

## Overview

The Guardian subscription parser transforms raw Zuora subscription data into a
structured format that matches guardian subscriptions more closely.

On top of the zod parsed ZuoraSubscription, the Guardian parser adds product catalog keys
and product catalog data (or zuora catalog data if it's not in the product catalog)

## Why It's Beneficial

- **Guardian Product Model**: Associates subscription rate plan with Guardian product keys (e.g. `Contribution`, `SupporterPlus`) and rate plan keys (e.g. `Annual`, `OneYearStudent`)
- **Simplified Charge Access**: Organizes charges by charge key (e.g. `Subscription`, `Thursday`) instead of as an array
- **Pre defined filters**: Built-in utilities to filter subscriptions by charge dates or custom filters.
- **Type Safety**: adding the product catalog keys makes the subscription a discriminated union giving added type safety.
- **Validation**: Ensures subscriptions have exactly one active rate plan before processing

## How to Use

### Basic Parsing and Filtering

```typescript
import { GuardianSubscriptionParser } from './guardianSubscriptionParser';
import { SubscriptionFilter } from './subscriptionFilter';
import { getSinglePlanFlattenedSubscriptionOrThrow } from './getSinglePlanFlattenedSubscriptionOrThrow';
import { zuoraSubscriptionSchema } from '@modules/zuora/types';
import zuoraCatalog from './catalog-prod.json';
import { productCatalog } from './productCatalog';
import dayjs from 'dayjs';
import { getSubscription } from "./subscription";

const today = dayjs();

// fetch subscription in the usual way, e.g.
const zuoraSubscription = getSubscription(zuoraClient, subscriptionNumber);

// Link subscription to catalog and add keys
const parser = new GuardianSubscriptionParser(zuoraCatalog, productCatalog);
const guardianSubscription = parser.toGuardianSubscription(zuoraSubscription);

// Filter to only rate plans that we are interested in
const filter = SubscriptionFilter.activeNonEndedSubscriptionFilter(today);
const filteredSubscription = filter.filterSubscription(guardianSubscription);

// Get single-plan subscription (throws if not exactly one active rate plan)
const subscription = getSinglePlanFlattenedSubscriptionOrThrow(filteredSubscription);
```
### Accessing Subscription Data

```typescript
// Subscription metadata is unaffected
console.log(subscription.subscriptionNumber); // 'A-S00000001'
console.log(subscription.accountNumber);
console.log(subscription.status);

// Product catalog keys are attached
console.log(subscription.ratePlan.productKey); // 'Contribution' | 'SupporterPlus' | etc
console.log(subscription.ratePlan.productRatePlanKey); // 'Monthly' | 'Annual' | 'OneYearStudent' | etc

// old style zuora catalog name is unaffected
console.log(subscription.ratePlan.productName); // 'Contributor' | 'Supporter Plus' | etc

// Charges organized by product type
if (subscription.ratePlan.productKey === 'Contribution') {
    // contribution annual and monthly both have only a charge called "Contribution"
    const contributionCharge = subscription.ratePlan.ratePlanCharges.Contribution;
    console.log(contributionCharge.price);
    console.log(contributionCharge.productRatePlanChargeId);
}

if (
    subscription.ratePlan.productKey === 'SupporterPlus' &&
    subscription.ratePlan.productRatePlanKey === 'OneYearStudent'
) {
    // type checker knows that Supporter Plus student includes "Subscription" charge
    const subscriptionCharge = subscription.ratePlan.ratePlanCharges.Subscription;
    console.log(subscriptionCharge.price);
    // @ts-expect-error "Contribution" only exists for Monthly/Annual so doesn't type check
    const contributionCharge = subscription.ratePlan.ratePlanCharges.Contribution; // XXX
}
```

## Sample Guardian subscription

See the inline notes on this example from the CODE environment.

```js
{
  id: "71a11631bb39c22b088c23ed34e1205b",
  accountNumber: "A01234567",
  subscriptionNumber: "A-S01234567",
  status: "Active",
  contractEffectiveDate: "2026-02-03T00:00:00.000Z",
  serviceActivationDate: "2026-02-03T00:00:00.000Z",
  customerAcceptanceDate: "2026-02-03T00:00:00.000Z",
  subscriptionStartDate: "2026-02-03T00:00:00.000Z",
  subscriptionEndDate: "2027-02-03T00:00:00.000Z",
  lastBookingDate: "2026-02-03T00:00:00.000Z",
  termStartDate: "2026-02-03T00:00:00.000Z",
  termEndDate: "2027-02-03T00:00:00.000Z",
  // rate plan has been filtered down to a single object so it's not an array
  ratePlan: {
    id: "71a11631bb39c22b088c23ed34e8205d",
    productId: "2c92c0f85a6b134e015a7fcc183e756f",
    productName: "Contributor",
    productRatePlanId: "2c92c0f85a6b134e015a7fcd9f0c7855",
    ratePlanName: "Monthly Contribution",
    // product key is from the product catalog
    productKey: "Contribution",
    // product is from the product catalog
    product: {
      active: true,
      billingSystem: "zuora",
      customerFacingName: "Support",
      isDeliveryProduct: false
    },
    // product rate plan key is from the product catalog
    productRatePlanKey: "Monthly",
    // product rate plan is from the product catalog
    productRatePlan: {
      billingPeriod: "Month",
      id: "2c92c0f85a6b134e015a7fcd9f0c7855",
      pricing: {
        AUD: 10,
        CAD: 5,
        EUR: 5,
        GBP: 5,
        NZD: 5,
        USD: 5
      },
      termLengthInMonths: 12,
      termType: "Recurring"
    },
    ratePlanCharges: {
      // charges are keyed off the product catalog charge keys
      Contribution: {
        id: "71a11631bb39c22b088c23ed34ea205f",
        productRatePlanChargeId: "2c92c0f85a6b1352015a7fcf35ab397c",
        number: "C-01881458",
        name: "Contribution",
        type: "Recurring",
        model: "FlatFee",
        currency: "GBP",
        effectiveStartDate: "2026-02-03T00:00:00.000Z",
        effectiveEndDate: "2027-02-03T00:00:00.000Z",
        billingPeriod: "Month",
        processedThroughDate: "2026-02-03T00:00:00.000Z",
        chargedThroughDate: "2026-03-03T00:00:00.000Z",
        upToPeriodsType: null,
        upToPeriods: null,
        price: 20,
        discountPercentage: null,
        billingPeriodAlignment: "AlignToCharge"
      }
    }
  },
  // can be zero or more discount rate plans
  // they are not in the product catalog so they link to the zuora catalog
  // they are still filtered the same as the main rate plan
  discountRatePlans: [
    {
      id: "71a11631bb39c22b088c23ed34972054",
      lastChangeType: "Add",
      productId: "2c92c0f85721ff7c01572940171363db",
      productName: "Discounts",
      productRatePlanId: "8ad081dd8fd3d9df018fe2b6a7bc379d",
      ratePlanName: "Cancellation Save Discount - Free for 2 months",
      // this is the product from the *zuora* catalog
      product: {
        id: "2c92c0f85721ff7c01572940171363db",
        name: "Discounts",
        description: "",
        effectiveStartDate: "2010-03-08",
        effectiveEndDate: "2099-03-08"
      },
      // this is the product rate plan from the *zuora* catalog
      productRatePlan: {
        id: "8ad081dd8fd3d9df018fe2b6a7bc379d",
        status: "Active",
        name: "Cancellation Save Discount - Free for 2 months",
        effectiveStartDate: "2024-06-04",
        effectiveEndDate: "2099-01-01",
        TermType__c: null,
        DefaultTerm__c: null
      },
      ratePlanCharges: {
        // charges are keyed by the charge name in the catalog
        Cancellation Save Discount - Free for 2 months: {
          id: "71a11631bb39c22b088c23ed34a32055",
          productRatePlanChargeId: "8ad081dd8fd3d9df018fe2ba736f398e",
          number: "C-01881459",
          name: "Cancellation Save Discount - Free for 2 months",
          type: "Recurring",
          model: "DiscountPercentage",
          currency: "GBP",
          effectiveStartDate: "2026-02-03T00:00:00.000Z",
          effectiveEndDate: "2026-04-03T00:00:00.000Z",
          billingPeriod: "Month",
          processedThroughDate: "1970-01-01T00:00:00.000Z",
          chargedThroughDate: null,
          upToPeriodsType: "Months",
          upToPeriods: 2,
          price: null,
          discountPercentage: 100,
          billingPeriodAlignment: "AlignToCharge",
          // this is the charge object from the zuora catalog
          productRatePlanCharge: {
            id: "8ad081dd8fd3d9df018fe2ba736f398e",
            name: "Cancellation Save Discount - Free for 2 months",
            type: "Recurring",
            model: "DiscountPercentage",
            pricing: [
              {
                currency: "USD",
                price: null,
                discountPercentage: 100
              },
              {
                currency: "NZD",
                price: null,
                discountPercentage: 100
              },
              {
                currency: "EUR",
                price: null,
                discountPercentage: 100
              },
              {
                currency: "GBP",
                price: null,
                discountPercentage: 100
              },
              {
                currency: "CAD",
                price: null,
                discountPercentage: 100
              },
              {
                currency: "AUD",
                price: null,
                discountPercentage: 100
              }
            ],
            endDateCondition: "Fixed_Period",
            billingPeriod: "Month",
            triggerEvent: "CustomerAcceptance",
            description: ""
          }
        }
      }
    }
  ]
}
```

## Tests

Key test files under `handlers/product-switch-api/`:
- `test/changePlan/guardianSubscription/getSinglePlanFlattenedSubscription.test.ts`
  - Unit tests covering parsing, filtering, and validation
- `runManual/realSusbcriptions/testRealSubscriptions.test.ts`
  - tests against downloaded, redacted production subscription data - see the readme there

## Future Improvements

- **Test more subscription types**: To use in MMA account overview we will need to support paper, membership, and more
- **Type Inference**: Close/refine a few gaps in type inference
- **Remove redundant fields**: Do we really need things like `lastBookingDate`?
- **Rationalise existing fields**: Can/should more fields be enums?
- **Add withMMAIdentityCheck style wrapper**: withMMAIdentityCheck returns a ZuoraSubscription - consider a withGuardianSubscription wrapper.
