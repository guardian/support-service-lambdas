## How to run the tests
To run the tests in identity.test.ts you need to create some config which will hold Jwt access tokens. To do this, follow these steps:
1. Ensure you have fresh Janus credentials for the membership account
2. Run the following command to retrieve the test config (this is a one-time setup):
   `aws s3 cp s3://support-service-lambdas-test/identity-module/support-service-lambdas-auth-token-test.json /etc/gu/support-service-lambdas-auth-token-test.json`
3. Get a fresh access token following the instructions below
4. Update the value of `validAuthHeader` in /etc/gu/support-service-lambdas-auth-token-test.json with the new token
You can then run the tests

## How to get a fresh access token
To get a fresh Okta Auth token, you can follow the instruction in this readme: https://github.com/guardian/identity/tree/main/docs/generating_tokens_locally
Or alternatively:
- ensure you are logged in to a guardian account via profile.code.dev-theguardian.com
- open the network tab in your browser's developer tools
- go to support.code.dev-theguardian.com and look for a request to the members-data-api /user/me endpoint
- copy the Authorization header from that request and paste it below