# Product Module
This module defines a model to describe our product structure and the mapping between that structure and the Zuora catalog which holds pricing information.

There are three main types involved in our product definitions:
## `ProductFamilyKey` 
This represents a family or category of products which we sell, available values are 
- `GuardianWeekly`
- `Newspaper`
- `Digital`
## `ZuoraProductKey`
This maps onto a particular product defined in the Zuora catalog. Each ZuoraProductKey belongs to a product family so it is a generic type: 
```typescript
type ZuoraProductKey<PF extends ProductFamilyKey>
``` 
available values for each product family key are:
#### Newspaper:
- `NationalDelivery`
- `HomeDelivery`
- `SubscriptionCard`
#### GuardianWeekly
- `Domestic`
- `RestOfWorld`
#### Digital
- `DigitalSubscription`
- `SupporterPlus`
- `Contribution`

## `ProductRatePlanKey`
This maps to an individual product rate plan. Each ProductRatePlanKey belongs to a specific product family and zuora product so it is also a generic type with the signature:
```typescript
type ProductRatePlanKey<
	PF extends ProductFamilyKey,
	ZP extends ZuoraProductKey<PF>,
>
```
Examples of product options for particular product families and Zuora products are:

#### Newspaper
- `HomeDelivery`
  - `Saturday`
  - `Sunday`
  - `Weekend`
  - `Sixday`
  - `Everyday`
- `NationalDelivery`
  - `Weekend`
  - `Sixday`
  - `Everyday` // National delivery doesn't have a Saturday and Sunday option

#### Digital
- `DigitalSubscription`
  - `Monthly`
  - `Annual`
  - `OneYearGift`
  - `ThreeMonthGift`
- `SupporterPlus`
  - `Monthly`
  - `Annual`

This diagram shows the mapping between this type model and the Zuora catalog:

![product-model-to-zuora.png](product-model-to-zuora.png)
# Usage
By providing a `ProductFamilyKey`, `ZuoraProductKey` and `ProductRatePlanKey` we can map to any [product rate plan](https://knowledgecenter.zuora.com/Zuora_Central_Platform/API/G_SOAP_API/E1_SOAP_API_Object_Reference/ProductRatePlan) in the Zuora catalog and from that we can retrieve the pricing information for that particular configuration. For instance if I want to find the GBP price to get the Newspaper delivered on a Saturday I can use the following:
```typescript
import { getZuoraCatalog } from '@modules/catalog/catalog';
import { getProductRatePlanId } from '@modules/product/productCatalogMapping';

const stage = 'CODE';
const catalog = await getZuoraCatalog(stage);

const productRatePlanId = getProductRatePlanId(
    stage,
    'Newspaper',
    'HomeDelivery',
    'Saturday',
);
const price = catalog.getCatalogPrice(productRatePlanId, 'GBP');
// price is 19.99

```

## Implementation
`ProductFamilyKey` is defined as a union type, `ZuoraProductKey` and `ProductRatePlanKey` are generic types which take type parameters specifying the product they are valid for, this ensures that we only use options which are appropriate for the given product

```typescript
import {getProductRatePlanId} from "./productToCatalogMapping";

const productRatePlanId = getProductRatePlanId(
    'CODE',
    'GuardianWeekly',
    'HomeDelivery', // TS2345: Argument of type "Digital" is not assignable to parameter of type "RestOfWorld" | "Domestic"
    'Monthly',
);
```
