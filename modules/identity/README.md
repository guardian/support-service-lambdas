# Identity Module
This module handles verifying a user's identity from an API request based on their Okta access token. 
There are two classess 
- OktaTokenHelper - this will decode an Okta Jwt token and return the Identity Id from the claims in the token.
- IdentityApiGatewayAuthenticator - this can be used to simplify authentication in lambdas which are triggered by API Gateway event, it will authenticate an `APIGatewayProxyEvent` and return either an `AuthenticatedApiGatewayEvent` object which contains the identity id of the signed in user if the token is valid, or a `FailedAuthenticationResponse` object which can be returned directly from the calling lambda if the token is invalid.

## API Gateway integration Example
```typescript
const identityAuthenticator = new IdentityApiGatewayAuthenticator(stage, ['my-required-scope']);

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    const authenticatedEvent = await identityAuthenticator.authenticate(event);
    if (authenticatedEvent.type === 'FailedAuthenticationResponse') {
        return authenticatedEvent;
    }
    console.log(`Identity ID is ${authenticatedEvent.identityId}`);
    // Do stuff with the authenticated event
}
```

## Tests
See the identity.test.ts file for examples of how to use the module and the [tests readme file](./test/README.md) for how to acquire a valid access token.

Documentation for the Okta library used [is here](https://github.com/okta/okta-jwt-verifier-js)