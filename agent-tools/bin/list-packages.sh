#!/usr/bin/env bash
# Prints every known workspace package path (handlers/*, modules/*, cdk, buildcheck, ...),
# one per line, read from pnpm-workspace.yaml.
#
# Usage: list-packages.sh [repo-root]   (defaults to the current directory)

set -euo pipefail

ROOT_DIR="${1:-$(pwd)}"
cd "$ROOT_DIR"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=agent-tools/bin/lib.sh
source "$SCRIPT_DIR/lib.sh"

list_known_packages


