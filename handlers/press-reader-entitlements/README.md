# PressReader Entitlements

This is an API, implemented as a lambda, to take a Braze UUID and return an XML document describing the entitlements a user has for the PressReader editions app. The process swaps the Braze ID for an Identity ID, then queries `SupporterProductData` in DynamoDB to get the subscriptions for that user. The entitlements are checked against the Product Catalog. If there is a valid subscription, the date of the latest is used in the return XML.

## Architecture diagam

![Architecture diagam](docs/press-reader-diagram.png 'Architecture diagram Diagram')
