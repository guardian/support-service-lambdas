#!/usr/bin/env bash
# Shows the content of a file at a given git ref.
# Rejects any file path that resolves outside the repository root.
#
# The special ref "main" resolves to the merge-base of HEAD and origin/main
# (i.e. the most recent commit on main that is an ancestor of the current
# branch), so the output is unaffected by any changes made in the current
# branch.  Falls back to local "main" if origin/main is unavailable.
#
# Usage: git-show.sh <repo-root> <ref> <file>
#   <ref>   any git ref (commit SHA, branch, HEAD, etc.), or the special
#           keyword "main" for merge-base resolution
#   <file>  repo-relative path (e.g. handlers/foo/src/bar.ts) or absolute path

set -euo pipefail

if [ $# -lt 3 ]; then
	echo "FAIL git-show requires exactly two arguments: <ref> <file>"
	exit 1
fi
REPO_ROOT="$1"
REF="$2"
FILE="$3"

# Resolve "main" to the merge-base against origin/main (preferred) or local main.
if [ "$REF" = "main" ]; then
	if git -C "$REPO_ROOT" rev-parse --verify origin/main >/dev/null 2>&1; then
		REF="$(git -C "$REPO_ROOT" merge-base HEAD origin/main)"
	elif git -C "$REPO_ROOT" rev-parse --verify main >/dev/null 2>&1; then
		REF="$(git -C "$REPO_ROOT" merge-base HEAD main)"
	else
		echo "FAIL could not resolve 'main': neither origin/main nor local main found" >&2
		exit 1
	fi
fi

# Normalise the file path to repo-relative.
if [ "${FILE#/}" != "$FILE" ]; then
	# Absolute path: must be inside the repo root.
	case "$FILE" in
	"$REPO_ROOT"/*)
		FILE="${FILE#"$REPO_ROOT"/}"
		;;
	*)
		echo "FAIL path is outside the repository: $FILE" >&2
		exit 1
		;;
	esac
fi

# Relative path: must not escape the repository root.
case "$FILE" in
../*)
	echo "FAIL path escapes the repository root: $FILE" >&2
	exit 1
	;;
esac

git -C "$REPO_ROOT" show "${REF}:${FILE}"


