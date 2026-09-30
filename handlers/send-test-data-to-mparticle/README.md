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

On success, the invocation completes without `FunctionError`; the handler does not return an application response payload. Events API and network failures cause the invocation to fail with a safe error.

## Payload

The payload follows the mParticle Events API request shape. `user_identities.customer_id` and `user_attributes` are required. Additional top-level fields and identity fields are preserved and forwarded.

The Lambda always sets `environment` to `development`, regardless of the value supplied in the input. It sends one `POST` request to the Events API endpoint for the configured mParticle pod, documented at [mParticle Events API](https://docs.mparticle.com/developers/apis/http/).

## Credentials and access

The Lambda reads the shared mParticle configuration used by `mparticle-acquisitions-publisher` from the CODE Parameter Store path:

`/CODE/support/mparticle-acquisitions-publisher`

The required values are:

- `mparticle/key`
- `mparticle/secret`
- `mparticle/pod`

The handler reads the mParticle values listed above from this shared path. Its additional SSM permission for this configuration is scoped to this path. The Lambda is not deployed to PROD and must not be used with production data.
