# generate-product-catalog lambda

This lambda generates a simplified product catalog from the full zuora catalog stored in the `gu-zuora-catalog` S3 bucket and writes it to the `gu-product-catalog` S3 bucket so it can be used by support-frontend.

It is triggered by updates to the zuora catalog json file and those are run on a schedule.

The final catalog is available at:

https://product-catalog.code.dev-guardianapis.com/product-catalog.json for CODE

and

https://product-catalog.guardianapis.com/product-catalog.json for PROD
