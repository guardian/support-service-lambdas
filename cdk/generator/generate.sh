#!/bin/bash -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"  # assuming script is in ./scripts/
echo repo root is $REPO_ROOT

cd "${SCRIPT_DIR}"
echo `pwd`

ALL_PACKAGE_NAMES=(
    "alarms-handler"
  #  "discount-api"
  #  "update-supporter-plus-amount"
  #  "product-switch-api"
)

generate_package_files() {
  local PACKAGE_NAME=$1
  local DEST_DIR="${REPO_ROOT}/handlers/${PACKAGE_NAME}/cdk"

  echo "⚙️ Generating standard files in: ${DEST_DIR}/"
  mkdir -p "$DEST_DIR"

  echo cdk.out > "${DEST_DIR}/.gitignore"
  SORTED_TEMPLATE_FILES=$(ls -1 template.*)
  for FILE in $SORTED_TEMPLATE_FILES; do
    BARE_NAME="${FILE#template.}"
    sed "s/{{PACKAGE_NAME}}/$PACKAGE_NAME-cdk/g" "$FILE" > "${DEST_DIR}/$BARE_NAME"
    echo $BARE_NAME >> "${DEST_DIR}/.gitignore"
    echo "  ✅ Generated ${DEST_DIR}/$BARE_NAME"
  done
  echo "✅ Generated all standard files in: ${DEST_DIR}/"
}

if [ $# -gt 0 ]; then
  generate_package_files "$1"
else
  for PACKAGE_NAME in "${ALL_PACKAGE_NAMES[@]}"; do
    generate_package_files "$PACKAGE_NAME"
  done
fi
