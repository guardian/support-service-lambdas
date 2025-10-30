# Product Switch Api

## Background
This project is intended to replace the product-move-api project. There are a number of reasons for this rewrite:

- The previous project had a very high error rate resulting in lots of alarms - the intention is to fix these during the rewrite
- The previous project used ZIO which is quite a divisive framework and has a steep learning curve for new developers - by moving to Typescript we hope to make it easy to maintain and contribute to for a wider number of developers

## Progress to date
This is the list of lambdas in the product-move-api and whether they have been migrated to the product-switch-api or not
- [x] The recurring contribution to supporter plus switch lambda
- [ ] The supporter plus cancellation lambda
- [ ] The membership to recurring contribution switch lambda
- [ ] The update supporter plus amount lambda
- [ ] The available product moves endpoint (don't think this is actually used?)

## Development
This project uses Typescript, see the [README](../../README.md#getting-started---typescript) in the root of the monorepo for more information on Typescript conventions in this repo. 

To work with this project
- Ensure pnpm is installed
- run `pnpm i` from the root of the repo
- run the unit tests with `pnpm t` (all tests in the monorepo) or `pnpm --filter product-switch-api test` (just the tests in this project)

There are also a number integration tests which will carry out switches with real subscriptions in the Zuora code environment. 
To run these you will need fresh Janus credentials, then you can run `pnpm --filter product-switch-api it-test` from the root of the monorepo. 

## Frequency change endpoint (experimental)

POST `/product-switch/frequency/{subscriptionNumber}`

Body:
```
{
	"preview": true | false,
	"targetBillingPeriod": "Month" | "Annual",
	"csrUserId": "optional CSR id",
	"caseId": "optional Salesforce case id"
}
```

Notes:
- When `preview=true` no amendment is currently performed (stub implementation) and an empty `previewInvoices` array is returned for success.
- When `preview=false` the handler returns a stub success with an empty `invoiceIds` array (actual Zuora amendment logic to be added in a follow-up change).
- Returns `success=false` with a reason if the subscription is already on the requested billing period or the current billing period is unsupported.

This endpoint is a scaffold to enable UI integration; it will later be enhanced to perform a real Zuora rate plan amendment and billing preview.