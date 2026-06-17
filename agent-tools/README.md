# agent-tools

## Overview

`agent-tools` is a repository-safe CLI for verify, repair, test, and read-only git helpers scoped to `handlers/*` and `modules/*` targets.

Use it from the repository root with `./agent-tool <command> [args...]`.

Command names, arguments, and behavior are source-of-truth in `agent-tools/src/index.ts`.

## Safety note

`test` is less safe than `verify` and `repair` because it executes repository code, so `agent-tools` forces `CI=true`, blocks integration-like scripts, and applies a fixed timeout.

## How to test

```bash
pnpm --filter agent-tools run type-check
pnpm --filter agent-tools run lint
pnpm --filter agent-tools run check-formatting
./agent-tool help
./agent-tool verify_changed
```

## References

- `agent-tools/src/index.ts`
- `.github/copilot-instructions.md`
