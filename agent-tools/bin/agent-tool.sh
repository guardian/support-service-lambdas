#!/usr/bin/env bash
# Main logic for ./agent-tool. Called by the thin wrapper at the repo root,
# which inserts the repo root as the first argument.

set -eo pipefail

ROOT_DIR="${1:?BUG: agent-tool wrapper must pass repo root as first argument}"
shift
# BIN_DIR is where all the scripts live, doesn't have to be in the current repo root.
BIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"
LOG_FILE="$(cd "$BIN_DIR/.." && pwd -P)/.last.log"

PER_PACKAGE_SCRIPTS="type-check lint lint-fix check-formatting fix-formatting test"
ROOT_SCRIPTS="snapshot:update install"

usage() {
	cat <<'EOF'
Usage:
  ./agent-tool <script> <package...>
  ./agent-tool <script> --changed [pattern]
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

Scripts:  type-check lint lint-fix check-formatting fix-formatting test

Flags:
  --grep PATTERN   only show lines matching the regex
  --invert         show lines NOT matching --grep (requires --grep)
  --context N      lines of context around --grep matches (requires --grep)
  --tail N         cap displayed output to the last N lines (default 200)
  --all            show the full output, uncapped

Default behaviour (no --grep/--tail/--all): output streams live, stopping after 100 lines with
a truncation notice. If truncated, use ./agent-tool last --all or read_file agent-tools/.last.log
to see the full output - avoid using shell commands to access the file directly.
EOF
}

CMD="${1:-}"
if [ -z "$CMD" ]; then
	usage
	exit 1
fi
shift || true

is_per_package_script() {
	case " $PER_PACKAGE_SCRIPTS " in
	*" $1 "*) return 0 ;;
	*) return 1 ;;
	esac
}

is_root_script() {
	case " $ROOT_SCRIPTS " in
	*" $1 "*) return 0 ;;
	*) return 1 ;;
	esac
}

# ---- parse trailing flags, shared by every command ----
CHANGED=0
GREP_PATTERN=""
GREP_INVERT=0
CONTEXT_LINES=""
TAIL_LINES=""
SHOW_ALL=0
POSITIONALS=()

while [ $# -gt 0 ]; do
	case "$1" in
	--changed)
		CHANGED=1
		shift
		;;
	--grep)
		GREP_PATTERN="${2:?FAIL --grep requires a pattern}"
		shift 2
		;;
	--invert)
		GREP_INVERT=1
		shift
		;;
	--context)
		CONTEXT_LINES="${2:?FAIL --context requires a number}"
		shift 2
		;;
	--tail)
		TAIL_LINES="${2:?FAIL --tail requires a number}"
		shift 2
		;;
	--all)
		SHOW_ALL=1
		shift
		;;
	*)
		POSITIONALS+=("$1")
		shift
		;;
	esac
done

if [ -n "$CONTEXT_LINES" ] && [ -z "$GREP_PATTERN" ]; then
	echo "FAIL --context requires --grep"
	exit 1
fi

if [ "$GREP_INVERT" -eq 1 ] && [ -z "$GREP_PATTERN" ]; then
	echo "FAIL --invert requires --grep"
	exit 1
fi

STREAM_CAP_LINES=100
DEFAULT_LAST_CAP_LINES=200
TRUNCATION_NOTICE="[showing first $STREAM_CAP_LINES lines — full output in $LOG_FILE — use ./agent-tool last with --grep, --last or --all]"

run_grep_filter() {
	if [ -z "$GREP_PATTERN" ]; then
		cat
		return 0
	fi
	local invert_flag=""
	[ "$GREP_INVERT" -eq 1 ] && invert_flag="-v"
	if [ -n "$CONTEXT_LINES" ]; then
		grep -E $invert_flag -C "$CONTEXT_LINES" "$GREP_PATTERN"
	else
		grep -E $invert_flag "$GREP_PATTERN"
	fi
	local grep_exit=$?
	[ "$grep_exit" -le 1 ] # 0 and 1 are both successful tool runs
}

stream_with_cap() {
	local line_count=0
	local truncated=0
	while IFS= read -r line; do
		if [ "$line_count" -lt "$STREAM_CAP_LINES" ]; then
			echo "$line"
			line_count=$((line_count + 1))
		else
      if [ "$truncated" -eq 0 ]; then
        echo "$TRUNCATION_NOTICE"
      fi
			truncated=1
			# drain remaining input so tee can finish writing the log
			while IFS= read -r _; do :; done
			break
		fi
	done
}

# Renders a log file for display: apply --grep/--invert/--context filtering
# first, then cap to the last N lines (--tail, default 200) unless --all was
# given. Used when --grep or --tail is set (post-run, not streaming).
#
# If the filter or the cap itself fails (e.g. a non-numeric --tail/--context
# value), a clear message is printed rather than the raw tool error, and
# rather than letting `set -e` silently abort the script before the
# OK/FAIL summary - the underlying command's exit code is unaffected either
# way, since it was already captured by run_pipeline before display_log runs.
display_log() {
	local log_file="$1"
	if [ "$SHOW_ALL" -eq 1 ]; then
		if ! run_grep_filter <"$log_file"; then
			echo "WARN output filtering failed (see error above, e.g. an invalid --context value) - this does not affect the OK/FAIL result below"
		fi
	else
		if ! run_grep_filter <"$log_file" | tail -n "${TAIL_LINES:-$DEFAULT_LAST_CAP_LINES}"; then
			echo "WARN output filtering/capping failed (see error above, e.g. an invalid --tail/--context value) - this does not affect the OK/FAIL result below"
		fi
	fi
}

# Runs `"$exe" "$@"`, writes full output to the per-repo log, and displays it.
#
# Display mode depends on flags:
#   default (no flags): stream live via tee, cap at STREAM_CAP_LINES lines,
#                       print truncation notice if longer
#   --all:              stream live via tee, uncapped
#   --tail N or --grep: run to completion, then display_log (post-run, filtered/capped)
#
# Always exits with the underlying command's exit code.
run_pipeline() {
	local description="$1"
	local exe="$2"
	shift 2
	local start=$SECONDS
	local cmd_exit
	set +o errexit

	if [ -z "$GREP_PATTERN" ] && [ -z "$TAIL_LINES" ]; then
		# Streaming mode: tee full output to log while displaying live.
		# set -o pipefail so a tee/stream failure is visible, but the
		# important exit code is pnpm's, captured from PIPESTATUS[0].
		set -o pipefail
		if [ "$SHOW_ALL" -eq 1 ]; then
			"$exe" "$@" 2>&1 | tee "$LOG_FILE"
		else
			"$exe" "$@" 2>&1 | tee "$LOG_FILE" | stream_with_cap
		fi
		cmd_exit=${PIPESTATUS[0]}
		set +o pipefail
	else
		# Buffered mode: capture everything, then display_log filters/caps.
		"$exe" "$@" >"$LOG_FILE" 2>&1
		cmd_exit=$?
		display_log "$LOG_FILE"
	fi

	set -o errexit
	local duration=$((SECONDS - start))
	if [ "$cmd_exit" -eq 0 ]; then
		echo "OK   $description (${duration}s)"
	else
		echo "FAIL $description (${duration}s)"
	fi
	exit "$cmd_exit"
}

case "$CMD" in
last)
	if [ ! -f "$LOG_FILE" ]; then
		echo "FAIL no previous command output recorded for this repository"
		exit 1
	fi
	display_log "$LOG_FILE"
	exit 0
	;;

git-rm)
	[ "${#POSITIONALS[@]}" -eq 1 ] || {
		echo "FAIL git-rm requires exactly one file path"
		exit 1
	}
	run_pipeline "git-rm ${POSITIONALS[0]}" bash "$BIN_DIR/git-rm.sh" "$ROOT_DIR" "${POSITIONALS[0]}"
	;;

git-mv)
	[ "${#POSITIONALS[@]}" -eq 2 ] || {
		echo "FAIL git-mv requires exactly two file paths: <source> <destination>"
		exit 1
	}
	run_pipeline "git-mv ${POSITIONALS[*]}" bash "$BIN_DIR/git-mv.sh" "$ROOT_DIR" "${POSITIONALS[@]}"
	;;

list-packages)
	run_pipeline "list-packages" bash "$BIN_DIR/list-packages.sh" "$ROOT_DIR"
	;;

git-status)
	run_pipeline "git-status" git --no-pager status --short
	;;

git-status-target)
	[ "${#POSITIONALS[@]}" -eq 1 ] || {
		echo "FAIL git-status-target requires exactly one package"
		exit 1
	}
	run_pipeline "git-status-target ${POSITIONALS[0]}" git --no-pager status --short -- "${POSITIONALS[0]}"
	;;

git-diff)
	run_pipeline "git-diff" git --no-pager diff --minimal
	;;

git-diff-staged)
	run_pipeline "git-diff-staged" git --no-pager diff --staged --minimal
	;;

git-diff-stat)
	run_pipeline "git-diff-stat" git --no-pager diff --stat
	;;

git-diff-staged-stat)
	run_pipeline "git-diff-staged-stat" git --no-pager diff --staged --stat
	;;

git-diff-target)
	[ "${#POSITIONALS[@]}" -eq 1 ] || {
		echo "FAIL git-diff-target requires exactly one package"
		exit 1
	}
	run_pipeline "git-diff-target ${POSITIONALS[0]}" git --no-pager diff --minimal -- "${POSITIONALS[0]}"
	;;

git-diff-target-stat)
	[ "${#POSITIONALS[@]}" -eq 1 ] || {
		echo "FAIL git-diff-target-stat requires exactly one package"
		exit 1
	}
	run_pipeline "git-diff-target-stat ${POSITIONALS[0]}" git --no-pager diff --stat -- "${POSITIONALS[0]}"
	;;

git-show)
	[ "${#POSITIONALS[@]}" -eq 2 ] || {
		echo "FAIL git-show requires exactly two arguments: <ref> <file>"
		exit 1
	}
	run_pipeline "git-show ${POSITIONALS[0]} ${POSITIONALS[1]}" bash "$BIN_DIR/git-show.sh" "$ROOT_DIR" "${POSITIONALS[0]}" "${POSITIONALS[1]}"
	;;

*)
	if [ "$CMD" = "install" ]; then
		run_pipeline "install" pnpm install
	elif is_root_script "$CMD"; then
		run_pipeline "$CMD" pnpm run "$CMD"
	elif is_per_package_script "$CMD"; then
		if [ "$CHANGED" -eq 1 ]; then
			run_pipeline "$CMD --changed" bash "$BIN_DIR/run-changed.sh" "$ROOT_DIR" "$CMD" "${POSITIONALS[@]}"
		else
			KNOWN_PACKAGES="$(bash "$BIN_DIR/list-packages.sh" "$ROOT_DIR")"
			PACKAGES=()
			EXTRA_ARGS=()
			for ARG in "${POSITIONALS[@]}"; do
				if echo "$KNOWN_PACKAGES" | grep -qxF "$ARG"; then
					PACKAGES+=("$ARG")
				else
					EXTRA_ARGS+=("$ARG")
				fi
			done
			if [ "${#PACKAGES[@]}" -eq 0 ]; then
				echo "FAIL $CMD requires at least one package or --changed"
				echo "  Packages must be workspace paths e.g. handlers/product-switch-api or modules/aws"
				exit 1
			fi
			if [ "${#EXTRA_ARGS[@]}" -gt 0 ] && [ "$CMD" != "test" ]; then
				echo "FAIL unexpected arguments for $CMD: ${EXTRA_ARGS[*]}"
				exit 1
			fi
			FILTER_ARGS=()
			for PKG in "${PACKAGES[@]}"; do
				FILTER_ARGS+=(--filter "./$PKG")
			done
			run_pipeline "$CMD ${PACKAGES[*]}" pnpm "${FILTER_ARGS[@]}" run --if-present "$CMD" "${EXTRA_ARGS[@]}"
		fi
	else
		echo "FAIL unknown command: $CMD"
		usage
		exit 1
	fi
	;;
esac

