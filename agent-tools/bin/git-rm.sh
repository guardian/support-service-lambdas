#!/usr/bin/env bash
# Safely removes a tracked file from the repo and stages the deletion.
# Rejects any path that resolves outside the repository root.
#
# Usage: git-rm.sh <file>

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
TARGET="${1:?usage: git-rm.sh <file>}"

ABS_PATH="$(cd "$(dirname "$TARGET")" 2>/dev/null && pwd)/$(basename "$TARGET")" || {
	echo "FAIL path does not exist: $TARGET"
	exit 1
}

case "$ABS_PATH" in
"$REPO_ROOT"/*) ;;
*)
	echo "FAIL path is outside the repository: $TARGET"
	exit 1
	;;
esac

REL_PATH="${ABS_PATH#"$REPO_ROOT"/}"
echo "RUN  git rm $REL_PATH"
git -C "$REPO_ROOT" rm "$REL_PATH"

