A script to sync the supporter product data Dynamo table with product data held by Zuora for a given identity id

## Usage

```bash
pnpm --filter sync-supporter-product-data sync-user [environment] [identityId]
```
Eg.
```bash
pnpm --filter sync-supporter-product-data sync-user CODE 200065441