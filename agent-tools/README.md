# agent-tools

## Overview

`agent-tools` is a repository-safe CLI for formatting, linting, type-checking, testing, and read-only git inspection.

Use it from the repository root with `./agent-tool <command> [args...]`.

Each command operates on one or more workspace packages (`handlers/<name>`, `modules/<name>`, `cdk`, `buildcheck`). Most commands accept `--changed` to automatically resolve packages from git-modified files rather than requiring explicit package names.

Command names are kebab-case (for example: `check-formatting`, `git-diff-stat`). Each command lives in its own file under `agent-tools/src/commands/`; `registry.ts` composes them.

Help output (`./agent-tool help`) is generated from the same command metadata.

## Safety note

`test` executes repository code. Run it only on packages you trust.

## Output modes

- Default: full child command output is streamed while deterministic progress/summary lines are emitted
- `--tail N`: write full streaming output to a temp log file (path printed before execution) and include last `N` lines for failures
- `--grep PATTERN`: stream only subcommand output lines that match the regex pattern
- `--tail N --grep PATTERN`: keep concise failure tails while also filtering streamed subcommand lines

## Verification and fix commands

Each accepts explicit packages or `--changed`:

- `check-formatting --changed`
- `lint --changed`
- `type-check --changed`
- `fix-formatting --changed`
- `lint-fix --changed`

## File operations

These commands canonicalise and validate all paths before acting — both reject any path that escapes the repository root.

- `git-rm <file>` — remove a tracked file and stage the deletion
- `git-mv <source> <destination>` — rename or move a tracked file within the repo

Never use `rm`, `git rm`, or `git mv` directly; use these commands instead so path safety is enforced and the operation can be approved in one go.

## How to test

```bash
pnpm --filter agent-tools run type-check
pnpm --filter agent-tools run lint
pnpm --filter agent-tools run check-formatting
pnpm --filter agent-tools run test
./agent-tool help
./agent-tool check-formatting --changed
./agent-tool snapshot-update
./agent-tool install
```
