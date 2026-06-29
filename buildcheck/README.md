# Buildcheck - build file checker

## What is buildcheck?
Buildcheck checks the content of the build files for all lambdas during CI.

The expected content is defined programmatically in typescript, similar to how CDK defines cloudformation.

After editing the build definition, refresh the build files using `pnpm snapshot:update`.

## Quick start: How do I...?
### ...add a dependency
1. open [data/build.ts](data/build.ts)
1. add it to the dependencies section of your lambda definition
1. run `pnpm snapshot:update`
### ...bump a version
1. open [data/dependencies.ts](data/dependencies.ts)
1. edit the version number accordingly
1. run `pnpm snapshot:update`
### ...fix failing buildcheck in CI
1. run `pnpm snapshot:update` to refresh the full set of build files
1. review (if necessary update the build definition and run snapshot:update again)
1. commit and push

## Why do we use buildcheck
The benefits are similar to CDK or SBT:
- prevent inconsistencies between lambdas/modules including dependency versions and pnpm scripts
- have a central list of recommended dependencies (with auto complete/type checking/static analysis)
- files can be generated where necessary e.g. adding a new handler
- allows more fine grained modules to be manageable improving build times and organisation
- easier to review new lambda boilerplate as it's guaranteed to be standard
