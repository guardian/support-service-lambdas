# generate-product-catalog lambda

This lambda takes a DynamoDB stream of changes to the `user-subscriptions` table in the `gu-aws-mobile` account 
and updates the `SupporterProductData` account.

## Running a full sync
To run a full sync of all subscriptions from the mobile purchases `user-subscriptions` table to `SupporterProductData` 
you can use the `runFullSync` command. This needs a CSV file containing data for all the subscriptions to sync. 
You can generate this date using the following BigQuery SQL query:
```sql
SELECT
  us.user_id,
  us.subscription_id,
  s.product_id,
  s.start_timestamp,
  s.end_timestamp
FROM
  `datatech-fivetran.mobile_purchases.mobile_purchases_prod_subscriptions` s
LEFT JOIN
  `datatech-fivetran.mobile_purchases.mobile_purchases_prod_user_subscriptions` us
ON
  s.subscription_id = us.subscription_id
WHERE
  1 = 1
  AND user_id IS NOT NULL
  AND us.subscription_id IS NOT NULL
  AND s.end_timestamp > CURRENT_TIMESTAMP()
```

You can then run the full sync command like so:
```bash
pnpm --filter mobile-purchases-to-supporter-product-data runFullSync
```

TODO: baby sitting the sync