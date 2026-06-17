# agent-tools

## Overview

`agent-tools` is a repository-safe CLI for verify, test, snapshot update, install, and read-only git helpers.

Use it from the repository root with `./agent-tool <command> [args...]`.

Command names, arguments, and behavior are source-of-truth in command registry metadata under `agent-tools/src/commands/*`.

Command names are snake_case (for example: `verify`, `check_formatting`, `git_diff_stat`).

The registry composes one file per command (or command pair) in `agent-tools/src/commands/registry.ts`.

Help output (`./agent-tool help`) is generated from the same command metadata.

## Safety note

`test` is less safe than verify/fix commands because it executes repository code, so `agent-tools` forces `CI=true` and applies a fixed timeout.

`install_workspace` is mutating; default mode is lock-safe (`--frozen-lockfile`).

## Output modes

- Default: full child command output is streamed while deterministic progress/summary lines are emitted
- `--tail N`: write full streaming output to a temp log file (path printed before execution) and include last `N` lines for failures
- `--grep PATTERN`: stream only subcommand output lines that match the regex pattern
- `--tail N --grep PATTERN`: keep concise failure tails while also filtering streamed subcommand lines

## Verification and fix commands

- Shortcut: `verify` / `verify --changed`
- Individual verification stages:
  - `check_formatting` / `check_formatting --changed`
  - `lint` / `lint --changed`
  - `type_check` / `type_check --changed`
- Individual fix stages:
  - `fix_formatting` / `fix_formatting --changed`
  - `lint_fix` / `lint_fix --changed`

These commands share a common runner implementation in `agent-tools/src/tools/targetScriptRunner.ts`.

## How to test

```bash
pnpm --filter agent-tools run type-check
pnpm --filter agent-tools run lint
pnpm --filter agent-tools run check-formatting
pnpm --filter agent-tools run test
./agent-tool help
./agent-tool verify --changed
./agent-tool snapshot_update
./agent-tool install_workspace
```
