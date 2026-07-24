#!/usr/bin/env bash
#
# devsh - open an interactive shell inside this project dev container.
#
# Works with JetBrains (/IdeaProjects/...) and VSCode (/workspaces/...) layouts.
# Finds the running container by matching a bind mount to the current git repo,
# then execs bash as the container user in the mounted project directory.
#
# Usage: ./.devcontainer/devsh.sh   (dev container must already be running)
#
set -euo pipefail

# Host project path (git repo root, or current dir if not a repo).
host_path=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

# Find a running container whose bind mount source matches host_path.
# Docker Desktop on macOS prefixes bind sources with /host_mnt, so match on suffix.
cid=""
dest=""
for c in $(docker ps -q); do
  for m in $(docker inspect "$c" --format "{{range .Mounts}}{{.Source}}={{.Destination}} {{end}}"); do
    src="${m%%=*}"
    dst="${m#*=}"
    case "$src" in
      *"$host_path") cid="$c"; dest="$dst"; break 2 ;;
    esac
  done
done

# Nothing matched: the container is probably not running yet.
if [ -z "$cid" ]; then
  echo "No running dev container found for: $host_path"
  echo "(Start it in your IDE first.)"
  exit 1
fi

# Detect the primary non-root user (uid 1000: vscode, node, ubuntu, ...); fall back to root.
uid_line=$(docker exec "$cid" getent passwd 1000 2>/dev/null || true)
user="${uid_line%%:*}"
[ -z "$user" ] && user=root

# Open an interactive shell in the mounted project directory as that user.
echo "-> container $cid as $user in $dest"
exec docker exec -it -u "$user" -w "$dest" "$cid" bash
