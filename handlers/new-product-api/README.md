# new-product-api

This project is the API backend for CSR acquisition onto a new product for existing customers.

It is used as an alternative to using "CSR mode" on the main site.

Something special about this code is that it actually adds a new sub to an existing zuora account, rather
than using a totally new account.  This simplifies payment method reuse, but it does create a difference
and can confuse the invoicing.
