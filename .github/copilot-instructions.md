This repository contains AWS lambdas inside the handlers directory.
Each lambda is either scala or typescript, but new lambdas are typescript.

## All code
Use camelCase file names
Prefer pure functions to reduce the need for mocking in unit tests - load config and create services and pass them in
When adding comments that explain generated code, prefix with "TODO:delete comment -"
When generating documentation e.g. README.md, include a brief overview, how to test, and references to external documentation.
Avoid adding new dependencies on external libraries.
PR descriptions must include links to previous relevant PRs, and any chat discussions and google docs.  Information from other sources should not be duplicated.

## Typescript
Use modules/aws/src/appConfig.ts to load config from SSM
Use zod to parse all JSON input, e.g. input data, or input from external APIs
To create a REST client, follow the existing pattern in modules/zuora/src/zuoraClient.ts
- have a static create method that takes the config as a parameter
- ensure that the exposed methods are the http methods, the high level calls should be implemented in separate files as per modules/zuora/src/discount.ts together with their schemas
Although new dependencies are to be avoided, these ones are acceptable:
- aws-sdk v3
- zod
