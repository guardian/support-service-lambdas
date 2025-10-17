# generate-product-catalog lambda

This lambda takes a DynamoDB stream of changes to the `user-subscriptions` table in the `gu-aws-mobile` account 
and updates the `SupporterProductData` account.
