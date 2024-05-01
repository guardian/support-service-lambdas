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