# Lambda generation

This folder contains templates for generating a new Typescript lambda using [Hygen](https://www.hygen.io/) 

## How to use

See [this readme](../handlers/HOWTO-create-lambda.md#typescript-lambdas) for more information on how to use them

## Developing

1. Add and remove scripts from new-lambda/api-gateway
1. Run `pnpm hygen new-lambda api-gateway` (or `pnpm new-lambda` for the full workflow)
1. enter a placeholder lambda name
1. check the content in the git diff, and revert the generated files before pushing (it can help to commit before generating)
