#!/usr/bin/env bash
set -euo pipefail

repoRoot="$(cd "$(dirname "$0")/../.." && pwd)"
tempDir="$(mktemp -d)"
trap 'rm -r -- "$tempDir"' EXIT
export MISE_TRUSTED_CONFIG_PATHS="$tempDir"

mise() {
  if [[ "$1" != latest ]]; then
    command mise "$@"
    return
  fi
  case "$2" in
    node@22) printf '%s\n' "${LATEST_NODE-22.23.4}" ;;
    pnpm@10) printf '%s\n' "${LATEST_PNPM-10.34.9}" ;;
    java@corretto-21) printf '%s\n' "${LATEST_JAVA-corretto-21.0.13.0.10}" ;;
    aqua:aws/aws-cli@2)
      [[ "${FAIL_AWS-false}" != true ]] || return 1
      printf '%s\n' "${LATEST_AWS-2.38.5}"
      ;;
    github:guardian/devenv) printf '%s\n' "${LATEST_DEVENV-20260930-111347}" ;;
    *) printf 'Unexpected version request: %s\n' "$2" >&2; return 1 ;;
  esac
}
export -f mise

fixture() {
  mkdir -p "$1/.github/workflows"
  cat > "$1/mise.toml" <<'TOML'
[tools]
"github:guardian/devenv" = "20260901-100000"
java = "corretto-21.0.12.0.10"
"aqua:aws/aws-cli" = "2.38.0"
sbt = "latest"

[settings]
idiomatic_version_file_enable_tools = ["node", "pnpm"]
TOML
  printf 'v22.22.0\n' > "$1/.nvmrc"
  printf '{\n\t"name": "fixture",\n\t"packageManager": "pnpm@10.33.0"\n}\n' > "$1/package.json"
  for workflow in ci-scala.yml scala-steward.yml sbt-dependency-graph.yaml; do
    printf "steps:\n  - uses: actions/setup-java@v6.0.1\n    with:\n      java-version: '21'\n      distribution: corretto\n      check-latest: true\n" \
      > "$1/.github/workflows/$workflow"
  done
}

runUpdater() {
  (cd "$1" && bash "$repoRoot/.github/scripts/updateToolVersions.sh")
}

fixture "$tempDir/success"
runUpdater "$tempDir/success"
[[ "$(cat "$tempDir/success/.nvmrc")" == v22.23.4 ]]
[[ "$(jq -r .packageManager "$tempDir/success/package.json")" == pnpm@10.34.9 ]]
[[ "$(jq -r .name "$tempDir/success/package.json")" == fixture ]]
grep -Fx 'java = "corretto-21.0.13.0.10"' "$tempDir/success/mise.toml"
grep -Fx '"aqua:aws/aws-cli" = "2.38.5"' "$tempDir/success/mise.toml"
grep -Fx '"github:guardian/devenv" = "20260930-111347"' "$tempDir/success/mise.toml"
grep -Fx 'sbt = "latest"' "$tempDir/success/mise.toml"
for workflow in "$tempDir/success/.github/workflows/"*; do
  grep -Fx "      java-version: '21'" "$workflow"
  grep -Fx '      check-latest: true' "$workflow"
done
cp -R "$tempDir/success" "$tempDir/before"
runUpdater "$tempDir/success"
diff -r "$tempDir/before" "$tempDir/success"

for invalid in 23.0.0 22.24.0-rc.1 22.21.0 ''; do
  fixture "$tempDir/invalid"
  cp -R "$tempDir/invalid" "$tempDir/unchanged"
  if LATEST_NODE="$invalid" runUpdater "$tempDir/invalid"; then
    printf 'Expected invalid Node version to fail: %s\n' "$invalid" >&2
    exit 1
  fi
  diff -r "$tempDir/unchanged" "$tempDir/invalid"
  rm -r -- "$tempDir/invalid" "$tempDir/unchanged"
done

fixture "$tempDir/failedDiscovery"
cp -R "$tempDir/failedDiscovery" "$tempDir/discoveryBefore"
if FAIL_AWS=true runUpdater "$tempDir/failedDiscovery"; then
  printf 'Expected failed AWS discovery to fail the update\n' >&2
  exit 1
fi
diff -r "$tempDir/discoveryBefore" "$tempDir/failedDiscovery"
printf 'Toolchain updater tests passed\n'
