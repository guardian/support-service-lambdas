#!/usr/bin/env bash
set -euo pipefail

fail() {
  printf 'Toolchain update failed: %s\n' "$*" >&2
  exit 1
}

latest() {
  local request="$1" pattern="$2" current="$3" version
  version="$(mise latest "$request")" || fail "Could not resolve $request"
  [[ "$version" =~ $pattern ]] || fail "Unexpected version for $request: $version"
  [[ "$(printf '%s\n%s\n' "$current" "$version" | sort -V | tail -n 1)" == "$version" ]] ||
    fail "$request would downgrade $current to $version"
  printf '%s' "$version"
}

nodeCurrent="$(tr -d '\r\n' < .nvmrc)"
[[ "$nodeCurrent" =~ ^v?([0-9]+)\.[0-9]+\.[0-9]+$ ]] || fail '.nvmrc must contain an exact version'
nodeMajor="${BASH_REMATCH[1]}"
packageManager="$(jq -er '.packageManager | strings' package.json)"
[[ "$packageManager" =~ ^pnpm@([0-9]+)\.[0-9]+\.[0-9]+(\+sha[0-9]+\.[a-fA-F0-9]+)?$ ]] ||
  fail 'packageManager must pin pnpm to an exact version'
pnpmMajor="${BASH_REMATCH[1]}"
pnpmCurrent="${packageManager#pnpm@}"
pnpmCurrent="${pnpmCurrent%%+*}"
javaCurrent="$(mise config get --file mise.toml tools.java)"
[[ "$javaCurrent" =~ ^corretto-([0-9]+)(\.[0-9]+){4}$ ]] || fail 'Java must pin an exact Corretto build'
javaMajor="${BASH_REMATCH[1]}"
awsCurrent="$(mise config get --file mise.toml 'tools."aqua:aws/aws-cli"')"
[[ "$awsCurrent" =~ ^([0-9]+)\.[0-9]+\.[0-9]+$ ]] || fail 'AWS CLI must contain an exact version'
awsMajor="${BASH_REMATCH[1]}"
devenvCurrent="$(mise config get --file mise.toml 'tools."github:guardian/devenv"')"
[[ "$devenvCurrent" =~ ^[0-9]{8}-[0-9]{6}$ ]] || fail 'Unexpected Guardian devenv version format'

nodeVersion="$(latest "node@$nodeMajor" "^$nodeMajor\\.[0-9]+\\.[0-9]+$" "${nodeCurrent#v}")"
pnpmVersion="$(latest "pnpm@$pnpmMajor" "^$pnpmMajor\\.[0-9]+\\.[0-9]+$" "$pnpmCurrent")"
javaVersion="$(latest "java@corretto-$javaMajor" "^corretto-$javaMajor(\\.[0-9]+){4}$" "$javaCurrent")"
awsVersion="$(latest "aqua:aws/aws-cli@$awsMajor" "^$awsMajor\\.[0-9]+\\.[0-9]+$" "$awsCurrent")"
devenvVersion="$(latest github:guardian/devenv '^[0-9]{8}-[0-9]{6}$' "$devenvCurrent")"

tempDir="$(mktemp -d)"
trap 'rm -r -- "$tempDir"' EXIT

if [[ "$pnpmVersion" != "$pnpmCurrent" ]]; then
  jq --tab --arg version "pnpm@$pnpmVersion" '.packageManager = $version' package.json > "$tempDir/package.json"
  cat "$tempDir/package.json" > package.json
fi
printf 'v%s\n' "$nodeVersion" > .nvmrc
mise config set --file mise.toml --type string tools.java "$javaVersion"
mise config set --file mise.toml --type string 'tools."aqua:aws/aws-cli"' "$awsVersion"
mise config set --file mise.toml --type string 'tools."github:guardian/devenv"' "$devenvVersion"

printf '| Tool | Previous | Selected |\n| --- | --- | --- |\n'
printf '| Node.js | %s | %s |\n' "$nodeCurrent" "$nodeVersion"
printf '| pnpm | %s | %s |\n' "$pnpmCurrent" "$pnpmVersion"
printf '| Corretto | %s | %s |\n' "$javaCurrent" "$javaVersion"
printf '| AWS CLI | %s | %s |\n' "$awsCurrent" "$awsVersion"
printf '| Guardian devenv | %s | %s |\n' "$devenvCurrent" "$devenvVersion"
