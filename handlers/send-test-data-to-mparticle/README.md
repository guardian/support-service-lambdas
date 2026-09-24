# Send test data to mParticle

This Lambda is a manual testing utility for sending profile data to the mParticle development environment. It is deployed in CODE only and is intended for direct invocation by authorised operators.

## Invocation

The deployed function is `send-test-data-to-mparticle-CODE`.

```bash
aws lambda invoke \
  --function-name send-test-data-to-mparticle-CODE \
  --cli-binary-format raw-in-base64-out \
  --payload '{"user_identities":{"customer_id":"test-browser-id1"},"user_attributes":{"last_single_contribution_amount":5}}' \
  /tmp/send-test-data-to-mparticle-response.json
```

The response contains the HTTP status returned by the Events API, for example:

```json
{"statusCode":200}
```

## Payload

The payload follows the mParticle Events API request shape. `user_identities.customer_id` and `user_attributes` are required. Additional top-level fields and identity fields are preserved and forwarded.

The Lambda always sets `environment` to `development`, regardless of the value supplied in the input. It sends one `POST` request to the EU1 Events API endpoint documented at [mParticle Events API](https://docs.mparticle.com/developers/apis/http/).

## Credentials and access

The Lambda reads the existing CODE credentials from these Parameter Store paths:

- `/CODE/support/mparticle-api/inputPlatform/key`
- `/CODE/support/mparticle-api/inputPlatform/secret`

Its role can read only those two parameters. The Lambda is not deployed to PROD and must not be used with production data.
