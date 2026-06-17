# agent-tools

## Overview

`agent-tools` is a repository-safe CLI for verify, test, snapshot update, install, and read-only git helpers scoped to `handlers/*` and `modules/*` targets.

Use it from the repository root with `./agent-tool <command> [args...]`.

If your approval tooling is path-specific, call it directly by absolute path, for example:
`/Users/john_duffell/code/duplicates/support-service-lambdas/agent-tool <command> ...`

Command names, arguments, and behavior are source-of-truth in `agent-tools/src/index.ts`.

## Safety note

`test` is less safe than verify/fix commands because it executes repository code, so `agent-tools` forces `CI=true` and applies a fixed timeout.

`install_workspace` is mutating; default mode is lock-safe (`--frozen-lockfile`).

## Output modes

- Default: full child command output is streamed while deterministic progress/summary lines are emitted
- `--tail N`: write full streaming output to a temp log file (path printed before execution) and include last `N` lines for failures
- `--grep PATTERN`: stream only subcommand output lines that match the regex pattern
- `--tail N --grep PATTERN`: keep concise failure tails while also filtering streamed subcommand lines

## Verification and fix commands

- Shortcut: `verify` / `verify_changed`
- Individual verification stages:
  - `check_formatting` / `check_formatting_changed`
  - `lint` / `lint_changed`
  - `type_check` / `type_check_changed`
- Individual fix stages:
  - `fix_formatting` / `fix_formatting_changed`
  - `lint_fix` / `lint_fix_changed`

## How to test

```bash
pnpm --filter agent-tools run type-check
pnpm --filter agent-tools run lint
pnpm --filter agent-tools run check-formatting
pnpm --filter agent-tools run test
./agent-tool help
./agent-tool verify_changed
./agent-tool snapshot_update
./agent-tool install_workspace
```

## References

- `agent-tools/src/index.ts`
- `.github/copilot-instructions.md`
