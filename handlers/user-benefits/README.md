# User benefits API

This API is an API Gateway triggered lambda to return information about the digital benefits or entitlements that a user has as a result of the subscriptions they have with us.

Authentication is done via an Okta JWT header in the request, using the [identity module.](../../modules/identity/README.md)

# Urls

- PROD: user-benefits.guardianapis.com/benefits/me
- CODE: user-benefits.code.dev-guardianapis.com/benefits/me
