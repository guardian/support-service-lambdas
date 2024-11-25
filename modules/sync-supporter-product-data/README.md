A script to sync the supporter product data Dynamo table with product data held by Zuora for a given identity id.
The script is idempotent, so can be run multiple times without causing any issues even if the data is already in sync.

## Usage

```bash
pnpm --filter sync-supporter-product-data sync-user [environment] [identityId]
```
Eg.
```bash
pnpm --filter sync-supporter-product-data sync-user CODE 200065441