## An API for handling the multiple account features of the Digital Plus product

See [this document](https://docs.google.com/document/d/1eqMn9zkg-iRK3Gi9ecmgGh8WWUYpLX6B3cOasTRYpns/edit?tab=t.0#heading=h.n725ldbma47t) for more details.

## URLs

#### CODE - https://multiple-account-api-code.support.guardianapis.com/

#### PROD - https://multiple-account-api.support.guardianapis.com/

## OpenAPI

The OpenAPI description for this handler is in `openapi.yaml`. The spec is linted automatically as part of `pnpm package`.

### Validate and preview locally

```bash
# Lint the OpenAPI spec
pnpm --filter multiple-account-api openapi:lint

# Open an interactive preview in the browser
pnpm --filter multiple-account-api openapi:preview
```

### External documentation

- OpenAPI specification: https://spec.openapis.org/oas/latest.html
- Redocly CLI: https://redocly.com/docs/cli/

## Endpoints

### Create new invitation

#### Request:

POST /subscriptions/{subscriptionName}/invitations

Headers: 'x-identity-id' - the identity id of the user creating the invitation

Example path: /subscriptions/A-S00974337/invitations

```JSON
{
  "secondaryUserEmail": "integration-test2+multiple-account@theguardian.com"
}
```

#### Response:

```JSON
{
  "invitationCode":"RpwR62kMnAxe"
}
```

#### Validation:

- The subscription must be an active subscription with the `multipleAccounts` benefit (eg. Digital Plus, Newspaper etc.) and must belong to the user creating the invitation
- The number of existing invitations for the subscription must be less than the maximum allowed (currently 5)
- There must not be an existing invitation for the same secondary user email and subscription

### List invitations for a primary subscription

#### Request:

GET /subscriptions/{subscriptionName}/invitations

Headers: 'x-identity-id' - the identity id of the primary user

Example path: /subscriptions/A-S00974337/invitations

#### Response:

```JSON
{
  "invitations": [
    {
      "subscriptionName": "A-S00974337",
      "invitationCode": "RpwR62kMnAxe",
      "primaryIdentityId": "20012345",
      "secondaryIdentityId": "30067890",
      "invitedDate": "2026-06-12",
      "expiryDate": 1781222400000
    }
  ]
}
```

### List secondary users for a primary subscription

#### Request:

GET /subscriptions/{subscriptionName}/secondary-users

Headers: 'x-identity-id' - the identity id of the primary user

Example path: /subscriptions/A-S00974337/secondary-users

#### Response:

```JSON
{
  "secondaryUsers": [
    {
      "subscriptionName": "A-S00974337",
      "secondaryIdentityId": "30067890",
      "primaryIdentityId": "20012345",
      "acceptedDate": "2026-06-12"
    }
  ]
}
```
