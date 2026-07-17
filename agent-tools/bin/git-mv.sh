#!/usr/bin/env bash
# Safely renames/moves a tracked file within the repo.
# Rejects any source or destination path that resolves outside the repository root.
#
# Usage: git-mv.sh <repo-root> <source> <destination>

set -euo pipefail

if [ $# -lt 3 ]; then
	echo "FAIL git-mv requires exactly two file paths: <source> <destination>"
	exit 1
fi
REPO_ROOT="$1"
SRC="$2"
DEST="$3"

resolve_existing() {
	local path="$1"
	local dir
	dir="$(cd "$(dirname "$path")" 2>/dev/null && pwd)" || return 1
	echo "$dir/$(basename "$path")"
}

resolve_new() {
	local path="$1"
	local dir
	dir="$(cd "$(dirname "$path")" 2>/dev/null && pwd)" || return 1
	echo "$dir/$(basename "$path")"
}

assert_inside_repo() {
	local abs_path="$1"
	local label="$2"
	case "$abs_path" in
	"$REPO_ROOT"/*) ;;
	*)
		echo "FAIL $label path is outside the repository"
		exit 1
		;;
	esac
}

SRC_ABS="$(resolve_existing "$SRC")" || {
	echo "FAIL source path does not exist: $SRC"
	exit 1
}
assert_inside_repo "$SRC_ABS" "source"

DEST_ABS="$(resolve_new "$DEST")" || {
	echo "FAIL destination directory does not exist: $DEST"
	exit 1
}
assert_inside_repo "$DEST_ABS" "destination"

SRC_REL="${SRC_ABS#"$REPO_ROOT"/}"
DEST_REL="${DEST_ABS#"$REPO_ROOT"/}"
echo "RUN  git mv $SRC_REL $DEST_REL"
git -C "$REPO_ROOT" mv "$SRC_REL" "$DEST_REL"


