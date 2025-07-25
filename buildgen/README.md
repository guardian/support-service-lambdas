# Buildgen - build file generator

## Background
As standard, we have to have a lot of similar package.json files across our handlers,
as well as other config.  There's no easy way to share config as the files generally have
to be physically present in the folder.  In some cases it's not even possible to have imports,
so the whole file content is similar, with a few accidental or intentional variations.

Buildgen programmatically creates configuration files from TS templates and per handler config.
To put it another way, buildgen to build definitions is what CDK is to cloudformation.

## Benefits
- allows separate CDK for each project, which makes our builds more scalable.
- prevents unintentional variations in per project configuration
- DRY means it's easier to keep things consistent

## How it runs

Buildgen runs automatically on pnpm install.

## How to develop

You can modify the config and templates in src/data and run buildgen manually.
```bash
cd buildgen

# Generate all handlers
pnpm run generate

# Generate a specific handler only
pnpm run generate <handler-name>
```
- TODO add a global clean script
- TODO prettier/lint 
- TODO write a script or pnpm target to do both migrate and diff
- TODO snapshot tests

## Migrating a project to be buildgen'ed

Not all handlers have been moved over to the new structure yet.

To move one over, start by preparing the existing handler folder:

1. move all lambda files into a new folder called "lambda" (leave README and riff-raff.yaml)
1. create a "cdk" folder alongside it
1. move the relevant files/chunks from /cdk/ lib and bin into the new cdk folder
1. back up the files that buildgen will replace

Now you can run buildgen and resolve any differences or issues:

1. update/add your handler config to buildgen/src/data/config.ts (you may need to update the templates too)
1. run buildgen on your handler
1. Compare the generated files with your backed-up versions
1. If needed, modify the data in `buildgen/src/config.ts` and templates in `src/template/` to match your requirements
1. repeat as needed
