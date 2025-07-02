#!/bin/bash -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"  # assuming script is in ./scripts/
echo repo root is $REPO_ROOT

cd "${SCRIPT_DIR}"
echo `pwd`

PACKAGE_NAMES=(
  "alarms-handler"
#  "discount-api"
#  "update-supporter-plus-amount"
#  "product-switch-api"
)

for PACKAGE_NAME in "${PACKAGE_NAMES[@]}"; do
  DEST_DIR="${REPO_ROOT}/handlers/${PACKAGE_NAME}/cdk"
  mkdir -p "$DEST_DIR"

  sed "s/{{PACKAGE_NAME}}/$PACKAGE_NAME-cdk/g" template.package.json > "${DEST_DIR}/package.json"
  cp template.gitignore ${DEST_DIR}/.gitignore

  echo "✅ Generated: ${DEST_DIR}/package.json"
done
