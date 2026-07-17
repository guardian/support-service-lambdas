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
- `agent-tools/bin/` contains the main script and its internal helpers:
  - `agent-tool.sh` - the main logic, called by the root `./agent-tool` wrapper
  - `changed-packages.sh` - prints git-changed workspace packages (reads `pnpm-workspace.yaml`)
  - `run-changed.sh` - runs a script across changed packages (+ dependents); also exposed as
    the root pnpm script `run:changed` for developers to call directly
  - `lib.sh` - shared helpers sourced by the scripts above
- `agent-tools/cmd/` contains the user-facing command scripts delegated to by `./agent-tool`:
  - `list-packages.sh` - prints every known workspace package
  - `git-rm.sh` / `git-mv.sh` - path-safe file operations
  - `git-show.sh` - shows a file's content at a given git ref, with merge-base resolution for `main`

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
./agent-tool git-show <ref> <file>
```

Scripts: `type-check`, `lint`, `lint-fix`, `check-formatting`, `fix-formatting`, `test`
Packages: `handlers/<name>`, `modules/<name>`, `cdk`, `buildcheck`

`--changed` resolves git-modified files to their containing workspace packages and includes
their downstream dependents (via pnpm's `...{path}` filter syntax), so a change to a shared
module also re-checks everything that depends on it. The same logic is also available as the
root pnpm script `run:changed` (`pnpm run:changed <script>`) for developers who prefer to call
it directly.

## Safety note

`test` executes repository code. Run it only on packages you trust.

## Output modes

**Default (no flags)**: output streams live. Stops displaying after 100 lines and prints a
truncation notice pointing at `agent-tools/.last.log`. The full output is always written to the
log regardless.

```
[showing first 100 lines — full output in agent-tools/.last.log — use ./agent-tool last or read_file agent-tools/.last.log to see everything]
```

**`--all`**: streams live, uncapped.

**`--tail N`**: runs to completion, then shows the **last N lines** from the log (post-run,
not streaming). Default when `--tail` is explicit is the N you specify; without `--tail` or
`--all` the streaming 100-line cap applies.

**`--grep`/`--invert`/`--context`**: always runs to completion (grep needs full input to compute
context windows). After the command finishes, filters the log and shows the result capped to
the first 100 lines (or `--tail N` / `--all`).

The full output is always captured to `agent-tools/.last.log` (gitignored, always overwritten),
regardless of which display mode was used. Use `./agent-tool last` to retrieve it with any
combination of flags.

If the display filtering/capping pipeline itself fails (e.g. a non-numeric `--tail` value), a
`WARN output filtering...` message is printed, but the OK/FAIL result and exit code still
reflect the underlying command only.

## Note on live output for humans

For a long-running command, open a second terminal and watch:

```bash
tail -f agent-tools/.last.log
```

## Exit codes

`./agent-tool` exits with the underlying `pnpm`/git command's exit code, captured before any
display filtering/capping happens - so a non-zero result always means the command genuinely
failed, never an artifact of the display step.

## File operations

`git-rm`/`git-mv` canonicalise and validate paths before acting - both reject any path that
escapes the repository root. Never use `rm`, `git rm`, or `git mv` directly.

`git-show <ref> <file>` shows a file's content at a given ref. The special ref `main` resolves
via `git merge-base HEAD origin/main` (falling back to local `main`) — this gives the state of
the file at the point main was last merged into the current branch, unaffected by any changes
made in the current branch. Accepts repo-relative or absolute paths; rejects paths outside the
repository root. This is an `agent-tool` subcommand, not a raw `git show` invocation.

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


