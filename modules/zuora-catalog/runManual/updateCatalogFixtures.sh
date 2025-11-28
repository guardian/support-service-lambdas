#!/bin/bash
set -ex

# This script refreshes the catalog test files from AWS
# they should always be kept up to date, to ensure the safety of the tests.

if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Please install it with: brew install jq"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# The guardian product catalog uses zuoraCatalogToProductKey and so on, so we can't match that order
# therefore we can use the name fields as a proxy to get things determinstic
JQ_FILTER='
  .products |= (sort_by(.name) | map(
    .productRatePlans |= (sort_by(.name) | map(
      .productRatePlanCharges |= (sort_by(.name) | map(
        .pricing |= sort_by(.currency) |
        .pricingSummary |= sort
      ))
    ))
  ))
'

aws s3 cp s3://gu-zuora-catalog/PROD/Zuora-CODE/catalog.json - --profile membership | jq "$JQ_FILTER" > "$SCRIPT_DIR/../test/fixtures/catalog-code.json"
aws s3 cp s3://gu-zuora-catalog/PROD/Zuora-PROD/catalog.json - --profile membership | jq "$JQ_FILTER" > "$SCRIPT_DIR/../test/fixtures/catalog-prod.json"

echo "Completed: Updated catalog-code.json and catalog-prod.json from s3://gu-zuora-catalog/PROD"