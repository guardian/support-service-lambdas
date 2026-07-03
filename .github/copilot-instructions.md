This repository contains AWS lambdas inside the handlers directory.
Each lambda is either scala or typescript, but new lambdas are typescript.

## All code

Use camelCase file names
Prefer pure functions to reduce the need for mocking in unit tests - load config and create services and pass them in
When adding comments that explain generated code, prefix with "TODO:delete comment -"
When generating documentation e.g. README.md, include a brief overview, how to test, and references to external documentation.
Avoid adding new dependencies on external libraries.
When accessing AWS, only use aws-sdk v3
PR descriptions must include links to previous relevant PRs, and any chat discussions and google docs. Information from other sources should not be duplicated.

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

`./agent-tool` is the AI's single approved entry point for repo-safe checks, git inspection,
and file operations - never call `pnpm`, `git`, `rm`, `tsc`, `eslint`, `jest`, etc. directly.
Call it by absolute path rather than calling `cd` first, e.g.
`/Users/john_duffell/code/support-service-lambdas/agent-tool <command>`.

Exception: while actively authoring or debugging the scripts under `agent-tools/bin/` or the
`agent-tool` wrapper itself, direct shell commands (bash, sed, awk, grep, chmod, git for scratch
test fixtures, etc.) are expected and fine - you cannot use a tool to build or debug itself.
The moment a change to `agent-tool`/`agent-tools/bin/` is validated, switch back immediately to
using `./agent-tool` exclusively for all repo-wide verification (type-check, lint, formatting,
tests, git inspection) - do not keep using raw `pnpm`/`git` for those out of habit.

Usage:

```
./agent-tool <script> <package...> [--grep PATTERN] [--invert] [--context N]
./agent-tool <script> --changed [pattern] [--grep PATTERN] [--invert] [--context N]
./agent-tool last [--tail N] [--all] [--grep PATTERN] [--invert] [--context N]
./agent-tool list-packages
./agent-tool snapshot:update
./agent-tool install
./agent-tool git-rm <file>
./agent-tool git-mv <source> <destination>
./agent-tool git-status
./agent-tool git-status-target <package>
./agent-tool git-diff / git-diff-staged / git-diff-stat / git-diff-staged-stat
./agent-tool git-diff-target <package> / git-diff-target-stat <package>
```

Scripts: `type-check`, `lint`, `lint-fix`, `check-formatting`, `fix-formatting`, `test`

Always scope to the minimum set of affected packages under `handlers/*`, `modules/*`, `cdk`, or `buildcheck`. Use `./agent-tool list-packages` if the package scope is unclear.

Package arguments must always be given as workspace paths, e.g. `handlers/product-switch-api` or `modules/aws` rather than `product-switch-api`.

Output filtering flags (filters run first, then the result is capped - see below):

- `--grep PATTERN` to show only lines matching a regex pattern
- `--invert` to show lines NOT matching `--grep` (requires `--grep`)
- `--context N` to keep N lines of context around each `--grep` match (requires `--grep`)
- `--tail N` to cap displayed output to the last N lines (default 200, applies to both live runs and `last`)
- `--all` to show the full output, uncapped
- `./agent-tool last` to retrieve the most recently recorded full output for this repository, re-filtered/re-capped by the same flags — every run's full combined output is always captured to a single, always-overwritten per-repo temp log file whose raw path is never printed, regardless of what was displayed

Note: commands do not stream in real time - the underlying command runs to completion, then the filtered/capped output prints once, followed by the OK/FAIL summary.

Recommended order (use the first applicable scoped command):

1. `./agent-tool list-packages` if the package scope is unclear
2. `./agent-tool git-diff-stat` or `./agent-tool git-diff-target-stat <package>`
3. `./agent-tool fix-formatting --changed` / `./agent-tool lint-fix --changed` / `./agent-tool type-check --changed` (run all three after making changes)
4. `./agent-tool test --changed` (or `./agent-tool test <packages...> [pattern]`) when tests are needed
   - The optional pattern is a Jest path filter, e.g. `./agent-tool test handlers/product-switch-api test/changePlan/action/pendingAmendments.test.ts`
5. `./agent-tool git-diff` or `./agent-tool git-diff-target <package>` when full diff detail is needed; `./agent-tool git-status-target <package>` for a status scoped to one package
6. `./agent-tool git-rm <file>` to delete a tracked file (staged automatically); `./agent-tool git-mv <source> <destination>` to rename/move one
   - Both commands validate the path(s) are inside the repository — never use `rm` or `git rm` directly
7. `./agent-tool snapshot:update` when buildcheck-managed snapshots are expected
8. `./agent-tool install` when dependencies or lockfiles need updating

`--changed` resolves the changed packages from git and also runs checks on their downstream dependents via pnpm's dependency graph, catching breakage in consumers of a changed module. Prefer it over explicit package names for verification commands.

`./agent-tool` exits with the underlying command's exit code, captured before any display filtering/capping - a non-zero result always means the command genuinely failed.

If `agent-tool` is missing a safer or more efficient command, suggest adding it (as a small script under `agent-tools/bin/`) rather than working around it with ad-hoc shell commands.

