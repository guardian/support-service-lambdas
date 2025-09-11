# Buildcheck - build file checker

## What is buildcheck?
Buildcheck checks the content of the build files for all lambda modules and their associated cdk modules on every build.

The expected content is defined programmatically in typescript, similar to how CDK defines cloudformation.

The build files are still committed as normal, and an update command is provided to refresh them from the definition.

## Pros and cons
The benefits and drawbacks of buildcheck are similar to CDK or SBT:
- prevent inconsistencies between lambdas/modules including dependency versions and pnpm scripts
- have a central list of recommended dependencies
- files can be generated where necessary, or buildcheck can be pulled in as a module to reuse definitions
- allows more fine grained modules to be manageable (i.e. separate CDK per lambda) improving build times and organisation
- easier to add and review new lambda boilerplate as it's guaranteed to be standard
- all the usual DRY benefits

The disadvantages are mainly around tooling:
- automated PRs to bump dependencies will fail unless the dependencies.ts file is updated accordingly
- harder to add dependencies as you need to add them to build.ts and then run update-build.
- non standard, could surprise new people
- extra level of abstraction, could slow down regular developers

## HOWTO
### Add a dependency
1. open [src/data/build.ts](src/data/build.ts) 
1. edit your lambda definition accordingly
1. run `pnpm update-build`
### Bump a version
1. open [src/data/dependencies.ts](src/data/dependencies.ts)
1. edit the version number accordingly
1. `pnpm update-build`
### Quick fix a failing buildcheck in GHA
1. run `pnpm update-build` to refresh the full set of build files
2. commit and push

### Edit the templates
Templates are stored in [src/data/handlerTemplate](src/data/handlerTemplate)

### Migrate an existing handler to use buildcheck
This requires the project to be restructured, and the definition added to buildcheck and then tested and refined.

1. run the migration script `pnpm run migrate-handler <handler-name>`
1. Add your new handler to [src/data/build.ts](src/data/build.ts)
1. Run `pnpm snapshot:assert <handler-name>` to see any differences
1. Edit the buildcheck data (and existing files) to resolve any differences
1. retest until you are happy
1. Run `pnpm snapshot:assert` to ensure no other handler has been affected
1. Run `pnpm update-build` to generate and overwrite the full set of build files (this should have no effect)
1. Check and update handlers/<handler-name>/cdk/bin/cdk.ts accordingly
1. Push and test your changes in CODE.

## Background
As standard, we have to have a lot of similar package.json files across our handlers,
as well as other config.  There's no easy way to share config as the files generally have
to be physically present in the folder.  In some cases it's not even possible to have imports,
so the whole file content is similar, save for a few accidental or intentional variations.

Buildcheck programmatically defines configuration files and per handler config in TS templates
and manages their content as part of the dev/CI process.
To put it a more familiar way, buildcheck to build definitions is what CDK is to cloudformation.

Since tooling expects the files to be located with the code, we commit snapshots of the
config where you would expect it to be normally.  If you need to change a file, update the
buildcheck files and regenerate the snapshots before you push.

## How it runs

The snapshot checking task runs automatically in GHA.  It makes sure that the committed files match
what the buildcheck code expects.
