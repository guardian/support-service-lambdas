# agent-tools: behaviour spec & manual test script

This file is both a **human-readable spec** (companion to [README.md](README.md)) and a
**test script for an AI agent to run**. Each test case below has a command, the expected
result (verified against the actual implementation), and cleanup steps where relevant.

**When to use this**: if you change anything under `agent-tools/bin/` or the root `agent-tool`
script, run through the test cases in the section(s) related to what you changed before
considering the change done. There is no automated test runner for this - work through the
relevant cases below and confirm actual output matches expected.

## Setup

Define this once per session:

```bash
AGENT_TOOL=/path/to/your/repo/agent-tool   # use your actual absolute path
```

All commands below assume you're at the repository root and that `git status` is otherwise
clean before you start (stash or commit anything in progress first) - several test cases read
real git state (`--changed`, `git-status`) and their expected output assumes a clean tree unless
a case says otherwise.

**Safety**: tests that create/rename/delete files use disposable `scratch-*` names. Always run
the cleanup step immediately after each such test. Never run `git-rm`/`git-mv` tests against
real tracked files.

---

## 1. Basic dispatch & validation

| # | Command | Expected |
|---|---------|----------|
| 1.1 | `$AGENT_TOOL` (no args) | Prints usage to stdout, exit code `1` |
| 1.2 | `$AGENT_TOOL bogus-command` | `FAIL unknown command: bogus-command` then usage, exit code `1` |
| 1.3 | `$AGENT_TOOL type-check` (no package, no `--changed`) | `FAIL type-check requires at least one package or --changed` + a hint line about workspace paths, exit code `1` |
| 1.4 | `$AGENT_TOOL type-check modules/not-a-real-package` | Same as 1.3 - an unrecognised package is treated as "no package given" since it doesn't match any known package, not as an error naming the specific bad path |
| 1.5 | `$AGENT_TOOL type-check handlers/product-switch-api some-unexpected-arg` | `FAIL unexpected arguments for type-check: some-unexpected-arg`, exit code `1` (only `test` accepts a trailing non-package argument, as a Jest pattern) |
| 1.6 | `$AGENT_TOOL --context 3` (no command at all) | `FAIL unknown command: --context` then usage, exit code `1` - flags without a command are treated as an unknown command name (flag-before-command validation is not implemented) |

## 2. `--context`/`--invert` validation

| # | Command | Expected |
|---|---------|----------|
| 2.1 | `$AGENT_TOOL type-check modules/logger --context 3` (no `--grep`) | `FAIL --context requires --grep`, exit code `1` |
| 2.2 | `$AGENT_TOOL type-check modules/logger --invert` (no `--grep`) | `FAIL --invert requires --grep`, exit code `1` |
| 2.3 | `$AGENT_TOOL type-check modules/logger --grep OK --context 2` | Runs normally; passes validation |
| 2.4 | `$AGENT_TOOL type-check modules/logger --grep OK --invert` | Runs normally; passes validation |

**Known gap** (documented, not yet fixed): `--tail`/`--context` values are not validated as
numeric up front. If a non-numeric value is given, the raw `tail`/`grep` error is printed but
the OK/FAIL result and exit code still correctly reflect the underlying command's outcome:

```
tail: illegal offset -- abc: Invalid argument
OK   type-check modules/logger (Ns)
```

The result is unambiguous — a display glitch never causes a genuine pass to appear as a failure.

## 3. Package resolution

| # | Command | Expected |
|---|---------|----------|
| 3.1 | `$AGENT_TOOL type-check modules/logger` | Runs `tsc --noEmit` for `modules/logger` only; `OK   type-check modules/logger (Ns)` |
| 3.2 | `$AGENT_TOOL type-check modules/logger modules/aws` | Runs across both packages in one pnpm invocation; `OK   type-check modules/logger modules/aws (Ns)` |
| 3.3 | `$AGENT_TOOL test modules/logger logger.test.ts` | Runs jest scoped to just `logger.test.ts` within `modules/logger` (fewer tests than the full suite) - confirms the trailing non-package arg is forwarded as a Jest path pattern |
| 3.4 | `$AGENT_TOOL type-check --changed` | Delegates to `pnpm run:changed type-check`; resolves changed packages from git status + their dependents; `OK   type-check --changed (Ns)` |
| 3.5 | With a clean working tree: `$AGENT_TOOL type-check --changed` | `WARN no changed handlers/*, modules/*, cdk, or buildcheck packages detected` then `OK   type-check --changed (Ns)` (exit code `0` - no changes is not a failure) |

## 4. Output modes and capping

| # | Command | Expected |
|---|---------|----------|
| 4.1 | `$AGENT_TOOL type-check modules/logger` (default, ≤100 lines output) | Full output streams live, no truncation notice |
| 4.2 | `$AGENT_TOOL <any command producing >100 lines>` | First 100 lines stream live, then the truncation notice: `[showing first 100 lines — full output in <abs-path>/.last.log — use ./agent-tool last or read_file <abs-path>/.last.log to see everything]`, then the OK/FAIL line |
| 4.3 | `$AGENT_TOOL <long command> --all` | Full output streams live, no cap, no truncation notice |
| 4.4 | `$AGENT_TOOL <long command> --tail 5` | Runs to completion (buffered), then shows the **last** 5 lines |
| 4.5 | `$AGENT_TOOL <command> --grep PATTERN` | Runs to completion (buffered), filters to matching lines, caps at 200; no streaming |
| 4.6 | `$AGENT_TOOL git-status --grep "^ M " --invert` | All lines NOT starting with ` M ` |
| 4.7 | `$AGENT_TOOL git-status --grep "^ M " --context 1` | Matching lines plus 1 line of context |
| 4.8 | Filter-then-cap order for `--grep`: `$AGENT_TOOL git-diff-stat --grep "package.json" --tail 3` | Filters first, *then* takes the last 3 of those - not the last 3 raw lines then filtered |

## 5. Exit codes

| # | Command | Expected |
|---|---------|----------|
| 5.1 | `$AGENT_TOOL type-check modules/logger` (passing code) | Exit code `0`, `OK   ...` line |
| 5.2 | Introduce a deliberate type error in a file, then `$AGENT_TOOL type-check modules/logger`, then revert the file | Exit code matches `tsc`'s real exit code (e.g. `2`), `FAIL type-check modules/logger (Ns)` line, full tsc error output shown (subject to the 200-line cap) |
| 5.3 | `$AGENT_TOOL git-mv nonexistent-file.txt somewhere.txt` | Fails cleanly (see section 7), non-zero exit |

## 6. `last` and log file behaviour

| # | Command | Expected |
|---|---------|----------|
| 6.1 | `rm -f agent-tools/.last.log`, then `$AGENT_TOOL last` | `FAIL no previous command output recorded for this repository`, exit code `1` |
| 6.2 | Run any command, then `$AGENT_TOOL last` | Shows that command's captured output (capped to 200 lines by default), exit code `0` |
| 6.3 | Run any command, then `$AGENT_TOOL last --tail 5` | Last 5 lines of the previous run's log |
| 6.4 | Run any command, then `$AGENT_TOOL last --all` | Full previous log, uncapped |
| 6.5 | Run any command, then `$AGENT_TOOL last --grep PATTERN` | Filtered view of the previous log (filter-then-cap order applies here too) |
| 6.6 | Run command A, then command B, then `$AGENT_TOOL last` | Shows only B's output - the log is overwritten, not appended, on every run |
| 6.7 | The OK/FAIL summary line itself is never present in `last`'s output | The summary is printed by `agent-tool` directly to stdout after `display_log` runs; it is never written into the log file, since the log only captures the underlying command's own stdout/stderr |

## 7. `git-rm` / `git-mv` (path safety)

Use disposable scratch files for all of these; clean up immediately after each.

| # | Command | Expected |
|---|---------|----------|
| 7.1 | `echo test > scratch-x.txt && git add scratch-x.txt && git commit -q -m temp`, then `$AGENT_TOOL git-rm scratch-x.txt` | `RUN  git rm scratch-x.txt` then `OK   git-rm scratch-x.txt (Ns)`; file removed and staged for deletion |
| 7.2 | Cleanup for 7.1: `git reset --soft HEAD~1` | Restores the working tree to before the scratch commit |
| 7.3 | `$AGENT_TOOL git-rm ../../../etc/passwd` | `FAIL path is outside the repository: ../../../etc/passwd`, exit code `1`, nothing touched |
| 7.4 | `$AGENT_TOOL git-rm` (no args) | `FAIL git-rm requires exactly one file path`, exit code `1` |
| 7.5 | Commit two scratch files (`scratch-a.txt`), then `$AGENT_TOOL git-mv scratch-a.txt scratch-b.txt` | `RUN  git mv scratch-a.txt scratch-b.txt` then `OK   git-mv ... (Ns)`; file renamed |
| 7.6 | `$AGENT_TOOL git-mv scratch-b.txt ../outside.txt` | `FAIL destination path is outside the repository`, exit code `1`, nothing moved |
| 7.7 | `$AGENT_TOOL git-mv onlyonearg.txt` | `FAIL git-mv requires exactly two file paths: <source> <destination>`, exit code `1` |
| 7.8 | Cleanup for 7.5/7.6: `git reset --soft HEAD~1 && rm -f scratch-a.txt scratch-b.txt` | Working tree restored |

## 8. Read-only git inspection

| # | Command | Expected |
|---|---------|----------|
| 8.1 | `$AGENT_TOOL git-status` | Repo-wide `git status --short`, capped/filterable like any other command |
| 8.2 | `$AGENT_TOOL git-status-target modules/logger` | `git status --short` scoped to just that package's path |
| 8.3 | `$AGENT_TOOL git-status-target` (no package) | `FAIL git-status-target requires exactly one package`, exit code `1` |
| 8.4 | `$AGENT_TOOL git-diff` / `git-diff-staged` | Full/staged diff, `--minimal` |
| 8.5 | `$AGENT_TOOL git-diff-stat` / `git-diff-staged-stat` | Diffstat summary, full/staged |
| 8.6 | `$AGENT_TOOL git-diff-target modules/logger` / `git-diff-target-stat modules/logger` | Diff/diffstat scoped to one package |
| 8.7 | `$AGENT_TOOL git-diff-target` (no package) | `FAIL git-diff-target requires exactly one package`, exit code `1` |

## 9. Root-level commands

| # | Command | Expected |
|---|---------|----------|
| 9.1 | `$AGENT_TOOL list-packages` | One workspace package path per line (`handlers/*`, `modules/*`, `cdk`, `buildcheck`) - only directories with their own `package.json` count (excludes plain code folders like `modules/test/`, `modules/utils/`) |
| 9.2 | `$AGENT_TOOL install` | Runs real `pnpm install` (not a custom `install` script - that name is a reserved pnpm lifecycle hook, so it's special-cased rather than defined in `package.json`) |
| 9.3 | `$AGENT_TOOL snapshot:update` | Runs the real buildcheck snapshot regeneration; check `git status` afterwards for unexpected regenerated-file diffs |

## 10. `changed-packages.sh` internals

This is the most logic-dense, most bug-prone script (every macOS/bash-3.2 portability bug found
during implementation showed up here first) - test it directly, not just via `--changed`.

| # | Command | Expected |
|---|---------|----------|
| 10.1 | `bash agent-tools/bin/changed-packages.sh .` with a clean tree | No output, exit code `0` |
| 10.2 | Modify a file in `modules/logger/src/`, then run 10.1 | Prints `modules/logger` (only) |
| 10.3 | Modify files in two different packages, then run 10.1 | Prints both package paths, one per line, sorted, deduplicated |
| 10.4 | Modify a file directly in `modules/` (not inside a package subfolder, e.g. `modules/errors.ts`) | Prints nothing for that file - it doesn't belong to any package (matches `list-packages`' package.json-presence rule) |
| 10.5 | `bash agent-tools/bin/list-packages.sh .` | Same package-discovery logic, unconditional (not git-dependent) - cross-check its output is a superset consistent with 10.1-10.4 |

## 11. `git-show`

| # | Command | Expected |
|---|---------|----------|
| 11.1 | `$AGENT_TOOL git-show HEAD modules/logger/src/logger.ts` | Prints the file contents at HEAD; `OK   git-show HEAD modules/logger/src/logger.ts (Ns)`, exit code `0` |
| 11.2 | `$AGENT_TOOL git-show main modules/logger/src/logger.ts` | Special ref: resolves to `git merge-base HEAD origin/main` (falls back to local `main`); prints file at that commit, `OK`, exit code `0` |
| 11.3 | `$AGENT_TOOL git-show HEAD modules/logger/src/logger.ts --tail 5` | Same as 11.1 but only last 5 lines shown - confirms output flags work with git-show |
| 11.4 | `$AGENT_TOOL git-show` (no args) | `FAIL git-show requires exactly two arguments: <ref> <file>`, exit code `1` |
| 11.5 | `$AGENT_TOOL git-show HEAD` (only ref, no file) | `FAIL git-show requires exactly two arguments: <ref> <file>`, exit code `1` |

---

## Known gaps (intentional, or not yet addressed)

- `--tail`/`--context` values are not validated as numeric up front (see section 2) - produces
  a raw `tail`/`grep` error message printed before OK/FAIL, but the OK/FAIL result and exit
  code are always correct.
- No bulk/directory-safe `rm` - `git-rm` only handles one tracked file at a time; deleting a
  whole directory or untracked build artifacts (e.g. `node_modules`) still requires raw `rm -rf`
  outside of `agent-tool`, per the explicit decision in `REFACTOR-PLAN.md`.
- Commands do not stream in real time when `--grep` or `--tail` is used - these require buffering
  since grep needs full input to compute context windows. The default (no flags) and `--all`
  modes do stream live. For long-running commands in buffered mode, use
  `tail -f agent-tools/.last.log` in a second terminal.
- Flags given as the first argument (e.g. `./agent-tool --context 3`) are treated as an unknown
  command name rather than producing a flag-validation error. This is an edge case with no
  practical impact since flags are only meaningful after a valid command.

