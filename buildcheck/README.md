# Buildcheck - build file checker

## What is buildcheck?
Buildcheck checks the content of the build files for all lambda modules and their associated cdk modules during CI.

The expected content is defined programmatically in typescript, similar to how CDK defines cloudformation.

If you edit the build definition, it's easy to refresh the build files using the update command provided.

## Quick start: How do I...?
### ...add a dependency
1. open [data/build.ts](data/build.ts) 
1. add it to the dependencies section of your lambda definition
1. run `pnpm snapshot:update`
### ...bump a version
1. open [data/dependencies.ts](data/dependencies.ts)
1. edit the version number accordingly
1. `pnpm snapshot:update`
### ...quickly fix buildcheck in CI
1. run `pnpm snapshot:update` to refresh the full set of build files
2. commit and push

## Migrating an existing handler to use buildcheck
This requires the project to be restructured, and the definition added to buildcheck and then tested and refined.

1. Add your new handler to [data/build.ts](data/build.ts)
1. Run `pnpm snapshot:assert <handler-name>` to see any differences
1. Edit the buildcheck data (and existing files) to resolve any differences
1. retest until you are happy
1. Run `pnpm snapshot:assert` to ensure no other handler has been affected
1. Run `pnpm snapshot:update` to generate and overwrite the full set of build files (this should have no effect)
1. Push and test your changes in CODE.

## Pros and cons of buildcheck
The benefits and drawbacks of buildcheck are similar to CDK or SBT:
- prevent inconsistencies between lambdas/modules including dependency versions and pnpm scripts
- have a central list of recommended dependencies
- files can be generated where necessary, or buildcheck can be pulled in as a module to reuse definitions
- allows more fine grained modules to be manageable improving build times and organisation
- easier to add and review new lambda boilerplate as it's guaranteed to be standard
- all the usual DRY benefits

The disadvantages are mainly around tooling:
- automated PRs to bump dependencies will fail unless the dependencies.ts file is updated accordingly (although dependabot etc doesn't yet work with pnpm catalog either)
- harder to add dependencies as you need to add them to build.ts and then run snapshot:update.
- non standard, could surprise new people
- extra level of abstraction, could slow down regular developers
