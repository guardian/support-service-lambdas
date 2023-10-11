# new-product-api

This project is the API backend for CSR acquisition onto a new product for existing customers. It is used by the [CreateSubscription](https://github.com/guardian/salesforce/blob/master/force-app/main/default/pages/CreateSubscription.page) visualforce page in Salesforce.

It is used by CSRs when a customer already has a Billing Account in Zuora. If a customer does not have a Billing Account, CSRs will use "CSR mode" on the main site.

Something special about this code is that it actually adds a new sub to an existing zuora account, rather
than using a totally new account.  This simplifies payment method reuse, but it does create a difference
and can confuse the invoicing.
