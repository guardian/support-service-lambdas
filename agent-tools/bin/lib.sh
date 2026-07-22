#!/usr/bin/env bash
# Shared helpers for agent-tools bin/ scripts. Source this file; do not execute directly.

# Expand one pnpm-workspace.yaml package entry (e.g. "handlers/*" or "cdk")
# into concrete, existing package directory paths, one per line. Only
# directories containing their own package.json count as packages (this
# excludes plain code subfolders like modules/test/ or modules/utils/).
expand_pattern() {
	local pattern="$1"
	if [ "${pattern%"/*"}" != "$pattern" ]; then
		local dir="${pattern%/*}"
		if [ -d "$dir" ]; then
			find "$dir" -mindepth 1 -maxdepth 1 -type d | while read -r sub; do
				[ -f "$sub/package.json" ] && echo "$sub"
			done
		fi
	else
		[ -f "$pattern/package.json" ] && echo "$pattern"
	fi
}

# Prints every known workspace package path (one per line, sorted), read from
# pnpm-workspace.yaml in the current directory (call `cd "$ROOT_DIR"` first).
list_known_packages() {
	local entries
	entries="$(
		grep -oE "^[[:space:]]*-[[:space:]]*'[^']+'" pnpm-workspace.yaml |
			sed -E "s/^[[:space:]]*-[[:space:]]*'([^']+)'/\1/"
	)"
	while read -r pattern; do
		[ -z "$pattern" ] && continue
		expand_pattern "$pattern"
	done <<<"$entries" | sort -u
}


