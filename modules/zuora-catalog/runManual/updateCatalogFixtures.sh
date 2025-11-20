#!/bin/bash
set -ex

# This script refreshes the catalog test files from AWS
# they should always be kept up to date, to ensure the safety of the tests.

if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install it with: brew install jq"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

aws s3 cp s3://gu-zuora-catalog/PROD/Zuora-CODE/catalog.json - --profile membership | jq '.products |= sort_by(.name)' > "$SCRIPT_DIR/../test/fixtures/catalog-code.json"
aws s3 cp s3://gu-zuora-catalog/PROD/Zuora-PROD/catalog.json - --profile membership | jq '.products |= sort_by(.name)' > "$SCRIPT_DIR/../test/fixtures/catalog-prod.json"

echo "Completed: Updated catalog-code.json and catalog-prod.json from s3://gu-zuora-catalog/PROD"