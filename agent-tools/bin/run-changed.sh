#!/usr/bin/env bash
# Runs a pnpm script across every package with git changes (plus their downstream
# dependents, via pnpm's `...{path}` filter syntax). Developer convenience command,
# no allowlist - contrast with ./agent-tool, which does apply an allowlist for the AI.
#
# Usage: run-changed.sh <script> [extra args]
#
# Note: intentionally does not use `set -u` - macOS ships bash 3.2, which has a
# long-standing bug where expanding an empty array under `set -u` (e.g. no
# changed packages, no extra args) throws "unbound variable".

set -eo pipefail

SCRIPT_NAME="${1:?usage: run-changed.sh <script> [extra args]}"
shift || true
EXTRA_ARGS=("$@")

REPO_ROOT="$(git rev-parse --show-toplevel)"
BIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CHANGED_PACKAGES=()
while IFS= read -r PKG; do
	[ -n "$PKG" ] && CHANGED_PACKAGES+=("$PKG")
done < <("$BIN_DIR/changed-packages.sh" "$REPO_ROOT")

if [ "${#CHANGED_PACKAGES[@]}" -eq 0 ]; then
	echo "WARN no changed handlers/*, modules/*, cdk, or buildcheck packages detected"
	exit 0
fi

FILTER_ARGS=()
for PKG in "${CHANGED_PACKAGES[@]}"; do
	FILTER_ARGS+=(--filter "...{./$PKG}")
done

echo "RUN  $SCRIPT_NAME on: ${CHANGED_PACKAGES[*]} (+ dependents)"
exec pnpm "${FILTER_ARGS[@]}" run --if-present "$SCRIPT_NAME" "${EXTRA_ARGS[@]}"



