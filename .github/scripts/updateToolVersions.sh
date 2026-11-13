#!/usr/bin/env bash
set -euo pipefail

# This script locally updates the tool dependency versions in the files
# to the latest available version in the given major release line.

fail() {
  printf 'Toolchain update failed: %s\n' "$*" >&2
  exit 1
}

latest() {
  local request="$1" pattern="$2" current="$3" version
  printf 'Looking up latest matching release: %s (current: %s).\n' "$request" "$current" >&2
  version="$(mise latest "$request")" || fail "Could not resolve $request"
  [[ "$version" =~ $pattern ]] || fail "Unexpected version for $request: $version"
  [[ "$(printf '%s\n%s\n' "$current" "$version" | sort -V | tail -n 1)" == "$version" ]] ||
    fail "$request would downgrade $current to $version"
  printf '%s' "$version"
}

printUpdate() {
  if [[ "$2" == "$3" ]]; then
    printf '%s is already up to date at %s; no version change needed.\n' "$1" "$3" >&2
  else
    printf 'Updated %s from %s to %s.\n' "$1" "$2" "$3" >&2
  fi
  printf '| %s | %s | [%s](%s) |\n' "$1" "$2" "$3" "$4"
}

updatePackageJson() {
  local packageManager current major version
  printf '\n=== package.json: pnpm ===\n' >&2
  packageManager="$(jq -er '.packageManager | strings' package.json)"
  [[ "$packageManager" =~ ^pnpm@([0-9]+)\.[0-9]+\.[0-9]+(\+sha[0-9]+\.[a-fA-F0-9]+)?$ ]] ||
    fail 'packageManager must pin pnpm to an exact version'
  major="${BASH_REMATCH[1]}"
  current="${packageManager#pnpm@}"
  current="${current%%+*}"
  version="$(latest "pnpm@$major" "^$major\\.[0-9]+\\.[0-9]+$" "$current")"
  if [[ "$version" != "$current" ]]; then
    jq --tab --arg version "pnpm@$version" '.packageManager = $version' package.json > "$tempDir/package.json"
    cat "$tempDir/package.json" > package.json
  fi
  printUpdate pnpm "$current" "$version" "https://github.com/pnpm/pnpm/releases/tag/v$version"
}

updateMiseTool() {
  local tool="$1" label="$2" policy="$3" pattern="$4"
  local urlPattern="$5" urlVersionPrefix="${6-}"
  local key="tools.\"$tool\"" current request releaseLine version urlVersion url
  printf '\n=== mise.toml: %s ===\n' "$label" >&2
  current="$(mise config get --file mise.toml "$key")"
  [[ "$current" =~ $pattern ]] || fail "Unexpected $label pin: $current"

  case "$policy" in
    current-major)
      releaseLine="${current%%.*}"
      request="$tool@$releaseLine"
      ;;
    timestamp)
      request="$tool"
      ;;
    *) fail "Unknown update policy for $tool: $policy" ;;
  esac

  version="$(latest "$request" "$pattern" "$current")"
  if [[ "$policy" == current-major && "$version" != "$releaseLine".* ]]; then
    fail "$request returned a version outside the current release line: $version"
  fi
  mise config set --file mise.toml --type string "$key" "$version"
  urlVersion="${version#"$urlVersionPrefix"}"
  url="${urlPattern//\{version\}/$urlVersion}"
  url="${url//\{major\}/${urlVersion%%.*}}"
  printUpdate "$label" "$current" "$version" "$url"
}

tempDir="$(mktemp -d)"
trap 'rm -r -- "$tempDir"' EXIT

printf '| Tool | Current | Update |\n| --- | --- | --- |\n'
updatePackageJson
updateMiseTool node Node.js current-major '^[0-9]+\.[0-9]+\.[0-9]+$' \
  'https://nodejs.org/en/blog/release/v{version}'
updateMiseTool java Corretto current-major '^corretto-[0-9]+(\.[0-9]+){4}$' \
  'https://github.com/corretto/corretto-{major}/releases/tag/{version}' 'corretto-'
updateMiseTool aqua:aws/aws-cli 'AWS CLI' current-major '^[0-9]+\.[0-9]+\.[0-9]+$' \
  'https://github.com/aws/aws-cli/blob/{version}/CHANGELOG.rst'
updateMiseTool github:guardian/devenv 'Guardian devenv' timestamp '^[0-9]{8}-[0-9]{6}$' \
  'https://github.com/guardian/devenv/releases/tag/{version}'
