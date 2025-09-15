This repository contains AWS lambdas inside the handlers directory.
Each lambda is either scala or typescript, but new lambdas are typescript.

## All code
Use camelCase file names
Prefer pure functions to reduce the need for mocking in unit tests - load config and create services and pass them in
When adding comments that explain generated code, prefix with "TODO:delete comment -"
When generating documentation e.g. README.md, include a brief overview, how to test, and references to external documentation.
Avoid adding new dependencies on external libraries.
PR descriptions must include links to previous relevant PRs, and any chat discussions and google docs.  Information from other sources should not be duplicated.

### Config
Only load secret and private information from config e.g. usernames, passwords
Non private environment specific information e.g. base urls, endpoints, ids, must be looked up based on a function parameter `stage: string`

## Typescript
Use modules/aws/src/appConfig.ts to load config from SSM
Use zod to parse all JSON input, e.g. input data, or input from external APIs

### Logging
Always use logger.log, instead of console.log.
In each handler, as soon as you know either the subscription id (or similar correlating information), add it to the logger context.

### REST clients
To create a REST client, follow the existing pattern in modules/zuora/src/zuoraClient.ts 
have a static create method that takes a suitable config object and stage as a parameter
ensure that the exposed methods are the http verbs
- only implement the necessary verbs
- the common code must be extracted to a shared "fetch" method 
- where a body is requested or returned it should be generic in REQ and/or RESP
- zod schemas should be passed in as parameters
All requests and responses should be logged
- include full request and response body

the high level calls should be implemented in separate files as per modules/zuora/src/discount.ts together with their schemas

### Dependencies
Although new dependencies are to be avoided, these ones are acceptable:
- aws-sdk v3
- zod
When accessing AWS, only use aws-sdk v3
Use the pnpm workspace catalog for the following dependencies:
- zod
- aws-sdk v3
