# Identity Module
This module handles verifying a user's identity from an API request based on their Okta access token. 
There are two classess 
- OktaTokenHelper - This will decode an Okta Jwt token and return the Identity Id from the claims in the token.
- ApiGatewayIdentityAuthenticator - this will authenticate an `APIGatewayProxyEvent` and return either an `AuthenticatedApiGatewayEvent` object which contains the identity id of the signed in user if the token is valid, or a `FailedAuthenticationResponse` object which can be returned directly from the calling lambda if the token is invalid.

See the identity.test.ts file for examples of how to use the module and acquire a valid access token.

Documentation for the Okta library used [is here](https://github.com/okta/okta-jwt-verifier-js)