This repository contains AWS lambdas inside the handlers directory.
Each lambda is either scala or typescript, but new lambdas are typescript.

## All code
Use camelCase file names
Prefer pure functions to reduce the need for mocking in unit tests - load config and create services and pass them in
When adding comments that explain generated code, prefix with "TODO:delete comment -"
When generating documentation e.g. README.md, include a brief overview, how to test, and references to external documentation.
Avoid adding new dependencies on external libraries.
When accessing AWS, only use aws-sdk v3
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

### CDK

Use SrCDK constructs from ./cdk/lib/cdk/ where possible.


In agent mode, to reduce approval fatigue, here is the order of preference for tools:
First choice: built in MCP functions
Second choice: agent-tool (all sub-commands can be approved in one go)
Third choice: consistent pnpm scripts (exact command strings can be manually approved)
Fourth choice: consistent shell commands
Last choice: arbitrary/ad hoc shell commmands

### Verification and repair

Always run type-check, fix-formatting and lint-fix as well as all relevant tests after making changes to Typescript code.

Call the agent-tool wrapper by absolute path rather than calling "cd" first, e.g. `/Users/john_duffell/code/support-service-lambdas/agent-tool <command>`.

Always scope to the minimum set of affected packages under `handlers/*`, `modules/*`, `cdk`, or `buildcheck`. Use `list-packages` if the package scope is unclear.

Package arguments must always be given as workspace paths, e.g. `handlers/product-switch-api` or `modules/aws` rather than `product-switch-api`.

Default output is verbose streaming. Use global output flag when needed:
- `--tail N` for concise output with failure tails and a full temp log path printed up front
- `--grep PATTERN` to stream only subcommand output lines that match a regex pattern

Recommended order (use the first applicable scoped command):
1. `./agent-tool list-packages` if the package scope is unclear
2. `./agent-tool git-diff-stat` or `./agent-tool git-diff-target-stat <package>`
3. `./agent-tool fix-formatting --changed` / `./agent-tool lint-fix --changed` / `./agent-tool type-check --changed` (run all three after making changes)
4. `./agent-tool test --changed` (or `./agent-tool test <packages...> [pattern]`) when tests are needed
    - The optional pattern is a Jest path filter, e.g. `./agent-tool test handlers/product-switch-api test/changePlan/action/pendingAmendments.test.ts`
    - Never use `cd` + `pnpm jest` directly; the pattern argument achieves the same scoping safely through agent-tool
5. `./agent-tool git-diff` or `./agent-tool git-diff-target <package>` when full diff detail is needed
6. `./agent-tool snapshot-update` when buildcheck-managed snapshots are expected
7. `./agent-tool install` when dependencies or lockfiles need updating

Prefer `--changed` over explicit package names for verification commands — it resolves directly changed packages from git and also runs checks on their downstream dependents via pnpm's dependency graph, catching breakage in consumers of a changed module.

If `agent-tools` is missing a safer or more efficient command, suggest adding it rather than working around it with ad-hoc shell commands.
