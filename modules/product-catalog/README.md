# Product Catalog Module
### If you are looking for how to regenerate catalog types, jump to the [implementation section](#implementation)

---------------------------------
## Introduction
This module defines a simplified product catalog model and mappings between that structure and the larger, more general catalog structure which we export from Zuora.

There are two main types involved in our product definitions and they map onto the identically named objects in the [Zuora product catalog](https://knowledgecenter.zuora.com/Zuora_Billing/Build_products_and_prices/Basic_concepts_and_terms/AAA_Product_Catalog_Concepts)
## `Product`
This represents a particular product defined in the Zuora catalog and contains a list of all the product rate plans which are available for the product.

## `ProductRatePlan`
This maps to a Zuora product rate plan and contains
- The zuora id - this is needed when creating new subscriptions
- price information for all currencies supported for this product 
- A list of all product rate plan charges in this product rate plan.

## `ProductRatePlanCharge`
All product rate plans contain at least one charge which when summed make up the price of the product rate plan. We need the id of these charges to set variable prices for subscriptions such as recurring contributions, so this is available in the catalog. 

_This diagram shows all products and their associated rate plans and charges:_

![product-catalog.png](product-catalog.png)
[Source for this diagram](https://miro.com/app/board/uXjVN1GbMvs=/)
# Usage
Finding the GBP price for home delivery of the Saturday Newspaper:
```typescript
import { getProductCatalogFromApi } from '@modules/product-catalog/api';

const catalog = await getProductCatalogFromApi('CODE');
const price = catalog.HomeDelivery.ratePlans.Saturday.pricing.GBP;
// price is 19.99

```
Fetching the Contribution charge id from the Supporter plus product to set the contribution amount on a Supporter plus subscription: 
```typescript
import { getProductCatalogFromApi } from '@modules/product-catalog/api';

const catalog = await getProductCatalogFromApi('PROD');
const contributionChargeId = catalog.SupporterPlus.ratePlans.Monthly.charges.Contribution.id;
```
## Implementation
The mapping between our object model and Zuora's catalog is defined in the files `generateProductCatalog.ts`, `zuoraToProductNameMapping.ts` and `generateTypeObject.ts`.

These files contain functions to generate the product catalog json from the Zuora catalog and also to create a type object which we use to define the types of which the catalog is comprised. This type object is written to `typeObject.ts` and checked into the repo. If it ever needs to be regenerated, it can be done so by running 
```shell
pnpm --filter product-catalog generateTypes
```
from the root of the repository.

## See also
The [`generate-product-catalog` lambda](../../handlers/generate-product-catalog/README.md) which uses the code in this module to save the current version of the product catalog to S3 whenever it is updated.