# agent-tools

## Overview

`agent-tools` is a repository-safe CLI for formatting, linting, type-checking, testing, and
read-only git inspection - the AI's single approved entry point for these operations.

It is a plain directory of bash scripts: no TypeScript, no `node_modules`, no separate pnpm
package. All output filtering is implemented with real Unix tools (`grep`, `tail`) rather
than reimplementing them.

Use it from the repository root with `./agent-tool <command> [args...]`. Always call it by
absolute path (`/path/to/repo/agent-tool ...`), not with `cd` first - it resolves its own
location internally so the caller's working directory never matters.

See [TESTING.md](TESTING.md) for the full behaviour spec and manual test cases - if you change
anything under `agent-tools/bin/` or the root `agent-tool` script, work through the relevant
section(s) there before considering the change done.

## How it works

- `./agent-tool` (repo root) is the AI's single approved entry point. It validates the
  requested script against a small allowlist, resolves packages (explicit paths or
  `--changed`), and runs a single `pnpm`/`git` invocation per command, redirecting its full
  output to the per-repo log file before applying any display filtering/capping.
- `agent-tools/bin/*.sh` are small, focused helper scripts:
  - `changed-packages.sh` - prints git-changed workspace packages (reads `pnpm-workspace.yaml`)
  - `list-packages.sh` - prints every known workspace package
  - `run-changed.sh` - developer convenience: run a script across changed packages (+ dependents),
    no allowlist. Also exposed as the root pnpm script `run:changed`.
  - `git-rm.sh` / `git-mv.sh` - path-safe file operations, exposed as root pnpm scripts
  - `lib.sh` - shared helpers sourced by the scripts above

## Usage

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
Packages: `handlers/<name>`, `modules/<name>`, `cdk`, `buildcheck`

`--changed` resolves git-modified files to their containing workspace packages and includes
their downstream dependents (via pnpm's `...{path}` filter syntax), so a change to a shared
module also re-checks everything that depends on it. It delegates to the root pnpm script
`run:changed`, which developers can also call directly (`pnpm run:changed <script>`) without
going through `./agent-tool` or its allowlist.

## Safety note

`test` executes repository code. Run it only on packages you trust.

## Note on live output

Commands do not stream output in real time - the underlying command runs to completion first
(writing everything to the log file), then the filtered/capped result is printed once, followed
by the OK/FAIL summary. This is a deliberate simplification for an AI caller, which only ever
sees a tool call's output after it returns anyway.

If you want to watch a long-running command live (e.g. a slow type-check across many packages),
open a second terminal and run:

```bash
tail -f agent-tools/.last.log
```

The log file is gitignored at `agent-tools/.last.log` (always in the same place, easy to find)
and is overwritten by every new `./agent-tool` invocation.

## Output filtering

- `--grep PATTERN` - only show lines matching the regex
- `--invert` - show lines NOT matching `--grep` (requires `--grep`)
- `--context N` - lines of context around each `--grep` match (requires `--grep`)
- `--tail N` - cap displayed output to the last N lines (default 200)
- `--all` - show the full output, uncapped

Filtering and capping apply identically to a live run's output and to `last`: filters
(`--grep`/`--invert`/`--context`) run first, then the result is capped to the last N lines
(`--tail`, default 200) unless `--all` is given. Every run's full combined stdout/stderr is
always captured to `agent-tools/.last.log` (gitignored, always overwritten), regardless of
what's displayed. Use `./agent-tool last` to read it back, re-filtered/re-capped by the same
flags.

If the display filtering/capping pipeline itself fails (e.g. a non-numeric `--tail` value), a
`WARN output filtering...` message is printed, but the OK/FAIL result and exit code still
reflect the underlying command only - a display glitch never causes a genuine pass to appear
as a failure.

## Exit codes

`./agent-tool` exits with the underlying `pnpm`/git command's exit code, captured before any
display filtering/capping happens - so a non-zero result always means the command genuinely
failed, never an artifact of the display step.

## File operations

`git-rm`/`git-mv` canonicalise and validate paths before acting - both reject any path that
escapes the repository root. Never use `rm`, `git rm`, or `git mv` directly.

## How to test

See [TESTING.md](TESTING.md) for the full manual test/spec walkthrough. Quick smoke test:

```bash
./agent-tool list-packages
./agent-tool type-check modules/logger
./agent-tool lint-fix --changed
./agent-tool last --tail 20
./agent-tool snapshot:update
./agent-tool install
```


