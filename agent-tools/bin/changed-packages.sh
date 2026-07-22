#!/usr/bin/env bash
# Prints the workspace packages (one per line) that have git changes, based on
# `git status --short --untracked-files=all`. Package prefixes are read from
# pnpm-workspace.yaml so this stays in sync with the workspace definition.
#
# Usage: changed-packages.sh [repo-root]   (defaults to the current directory)

set -euo pipefail

ROOT_DIR="${1:-$(pwd)}"
cd "$ROOT_DIR"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=agent-tools/bin/lib.sh
source "$SCRIPT_DIR/lib.sh"

# Known package paths from pnpm-workspace.yaml, one per line.
KNOWN_PACKAGES="$(list_known_packages)"

# Changed (including untracked) file paths; take the destination side of renames ("a -> b").
CHANGED_FILES="$(
	git --no-pager status --short --untracked-files=all |
		cut -c4- |
		awk '{ n = split($0, parts, " -> "); print parts[n] }'
)"

[ -z "$CHANGED_FILES" ] && exit 0

# For each changed file, find the longest known package path that is a prefix of it.
# NR==FNR reads the known-packages file first (as a lookup table), then processes
# the changed-files list from the second file argument.
awk '
	NR == FNR {
		pkgs[FNR] = $0
		n = FNR
		next
	}
	{
		file = $0
		best = ""
		for (i = 1; i <= n; i++) {
			pkg = pkgs[i]
			if (pkg == "") continue
			if (file == pkg || index(file, pkg "/") == 1) {
				if (length(pkg) > length(best)) best = pkg
			}
		}
		if (best != "") print best
	}
' <(printf '%s\n' "$KNOWN_PACKAGES") <(printf '%s\n' "$CHANGED_FILES") | sort -u
