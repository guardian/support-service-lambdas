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
node = "22.22.0"
"github:guardian/devenv" = "20260901-100000"
java = "corretto-21.0.12.0.10"
"aqua:aws/aws-cli" = "2.38.0"
sbt = "latest"

[settings]
idiomatic_version_file_enable_tools = ["pnpm"]
TOML
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
runUpdater "$tempDir/success" > "$tempDir/versions.md" 2> "$tempDir/update.log"
[[ "$(wc -l < "$tempDir/versions.md")" -eq 7 ]]
[[ "$(grep -c '^|' "$tempDir/versions.md")" -eq 7 ]]
grep -Fx '| Tool | Current | Update |' "$tempDir/versions.md"
grep -Fx '| pnpm | 10.33.0 | [10.34.9](https://github.com/pnpm/pnpm/releases/tag/v10.34.9) |' "$tempDir/versions.md"
grep -Fx '| Node.js | 22.22.0 | [22.23.4](https://nodejs.org/en/blog/release/v22.23.4) |' "$tempDir/versions.md"
grep -Fx '| Corretto | corretto-21.0.12.0.10 | [corretto-21.0.13.0.10](https://github.com/corretto/corretto-21/releases/tag/21.0.13.0.10) |' "$tempDir/versions.md"
grep -Fx '| AWS CLI | 2.38.0 | [2.38.5](https://github.com/aws/aws-cli/tree/2.38.5) |' "$tempDir/versions.md"
grep -Fx '| Guardian devenv | 20260901-100000 | [20260930-111347](https://github.com/guardian/devenv/releases/tag/20260930-111347) |' "$tempDir/versions.md"
grep -Fx '=== package.json: pnpm ===' "$tempDir/update.log"
grep -Fx '=== mise.toml: Node.js ===' "$tempDir/update.log"
grep -F 'Looking up latest matching release: node@22 (current: 22.22.0).' "$tempDir/update.log"
grep -F 'Updated Node.js from 22.22.0 to 22.23.4.' "$tempDir/update.log"
grep -Fx 'node = "22.23.4"' "$tempDir/success/mise.toml"
[[ ! -e "$tempDir/success/.nvmrc" ]]
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
runUpdater "$tempDir/success" > "$tempDir/unchangedVersions.md" 2> "$tempDir/unchanged.log"
grep -F 'pnpm is already up to date at 10.34.9; no version change needed.' "$tempDir/unchanged.log"
grep -F 'Node.js is already up to date at 22.23.4; no version change needed.' "$tempDir/unchanged.log"
diff -r "$tempDir/before" "$tempDir/success"

fixture "$tempDir/failedDiscovery"
if FAIL_AWS=true runUpdater "$tempDir/failedDiscovery"; then
  printf 'Expected failed AWS discovery to fail the update\n' >&2
  exit 1
fi
grep -Fx 'node = "22.23.4"' "$tempDir/failedDiscovery/mise.toml"
[[ "$(jq -r .packageManager "$tempDir/failedDiscovery/package.json")" == pnpm@10.34.9 ]]
grep -Fx 'java = "corretto-21.0.13.0.10"' "$tempDir/failedDiscovery/mise.toml"
grep -Fx '"aqua:aws/aws-cli" = "2.38.0"' "$tempDir/failedDiscovery/mise.toml"
grep -Fx '"github:guardian/devenv" = "20260901-100000"' "$tempDir/failedDiscovery/mise.toml"

for invalid in \
  NODE=23.0.0 \
  NODE=22.24.0-rc.1 \
  NODE=22.21.0 \
  NODE= \
  JAVA=corretto-22.0.1.0.1 \
  JAVA=corretto-21.0.14.0.1-rc \
  JAVA=corretto-21.0.11.0.1 \
  AWS=3.0.0 \
  AWS=2.39.0-rc \
  AWS=2.37.0 \
  DEVENV=latest \
  DEVENV=20260801-100000; do
  fixture "$tempDir/invalidMise"
  tool="${invalid%%=*}"
  case "$tool" in
    NODE) key=tools.node ;;
    JAVA) key=tools.java ;;
    AWS) key='tools."aqua:aws/aws-cli"' ;;
    DEVENV) key='tools."github:guardian/devenv"' ;;
  esac
  previous="$(command mise config get --file "$tempDir/invalidMise/mise.toml" "$key")"
  if (cd "$tempDir/invalidMise" && env "LATEST_$invalid" bash "$repoRoot/.github/scripts/updateToolVersions.sh"); then
    printf 'Expected invalid mise tool version to fail: %s\n' "$invalid" >&2
    exit 1
  fi
  [[ "$(command mise config get --file "$tempDir/invalidMise/mise.toml" "$key")" == "$previous" ]]
  rm -r -- "$tempDir/invalidMise"
done
printf 'Toolchain updater tests passed\n'
