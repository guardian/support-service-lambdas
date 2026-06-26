# Zuora objectQuery

This package provides a typed way to build and execute object queries
via Zuora [Object Query API](https://developer.zuora.com/v1-api-reference/api/object-queries).

Currently implemented in [`index.ts`](./index.ts):

- [`accounts - Zuora docs`](https://developer.zuora.com/v1-api-reference/api/object-queries/queryaccounts)
- [`orders - Zuora docs`](https://developer.zuora.com/v1-api-reference/api/object-queries/queryorders)

## How to run a query

Use the exported [`objectQuery`](./index.ts) map and call `.execute(...)` on a query type:

```ts
import { objectQuery } from '@modules/zuora/objectQuery';

const result = await objectQuery.accounts.execute(
  zuoraClient,
  ['id', 'name', 'accountNumber', 'balance'],
  ['subscriptions.rateplans.rateplancharges'],
  [{ field: 'IdentityId__c', operator: 'EQ', value: identityId }],
  50,
);
```

For a real usage example, see:
<https://github.com/guardian/support-service-lambdas/search?q=%40modules%2Fzuora%2FobjectQuery&type=code>

## Adding a new query type

Currently supported query types are listed in [`index.ts`](./index.ts).  
To add a new one:

1. Add field/expand/queryable-field definitions under [`queries/`](./queries).  
   It’s usually a good idea to paste the relevant Zuora docs for that object into Copilot while building this out.  
   Notes:
   - Be aggressive about removing fields from generated code: many are unsupported by our tenant, or not useful for our use-cases.
   - Field docs are not always clear on true nullability. Querying the data lake can help validate what is nullable in practice.
   - Ask Copilot to include each field description as a Javadoc-style comment on the generated schema/types.
   - Copilot helps with translation, but as always it does not replace human judgement and review.
2. Create a new builder instance using [`ObjectQueryBuilder`](./objectQueryBuilder.ts).
3. Export it from [`index.ts`](./index.ts) on the `objectQuery` convenience object.

After wiring this up, follow the pattern in [How to run a query](#how-to-run-a-query).

## More info

This client gives callers:

- autocomplete/type-checking for `fields`, `expand`, `filter`, `sort`
- runtime response validation (via [`zod`](https://github.com/colinhacks/zod))
- a consistent query shape for all supported object types

Core implementation: [`ObjectQueryBuilder`](./objectQueryBuilder.ts)

Zuora guide for query parameter format (`fields`, `expand`, `filter`, `sort`):  
<https://developer.zuora.com/docs/guides/expand-filter-fields-sort>

## Possible future improvements:

- Add gzip support for object query responses.
- Make `includeNullFields` configurable/off in PROD mode (it's enabled so we can prove the field names are correct).
- Add Guardian custom fields e.g. ReaderType__c into schemas/registries where missing.
