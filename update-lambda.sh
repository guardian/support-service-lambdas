#!/bin/sh

# This script will build the provided project, copy the zip file to S3 and then call
# `update-function-code` with the AWS Cli to update the lambda.
# Usage: ./update-lambda.sh [project name] [--quick] [function names...]
# eg. ./update-lambda.sh discount-api
# eg. ./update-lambda.sh --quick mparticle-api "mparticle-api-http-" "mparticle-api-baton-"

# Exit if any of these commands fail
set -e

cd "$(dirname "$0")"

if [ $# -lt 1 ]; then
  echo "please provide the project name as an argument, eg. ./update-lambda.sh [--quick] discount-api [function names...]"
  exit 2
fi

QUICK_MODE=""
PROJECT_NAME=""
function_names=""

while [ $# -gt 0 ]; do
  if [ "$1" = "--quick" ]; then
    QUICK_MODE="true"
  elif [ -z "$PROJECT_NAME" ]; then
    PROJECT_NAME="$1"
  else
    function_names="$function_names $1"
  fi
  shift
done

if [ -z "$PROJECT_NAME" ]; then
  echo "please provide the project name as an argument, eg. ./update-lambda.sh discount-api [--quick] [function names...]"
  exit 2
fi

if [ -z "$function_names" ]; then
  function_names="$PROJECT_NAME-"
fi

echo "Updating handler $PROJECT_NAME"

if [ -n "$QUICK_MODE" ]; then
  pushd "handlers/$PROJECT_NAME"
  pnpm build
  cd target && zip -qr "$PROJECT_NAME.zip" ./*.js.map ./*.js
  popd
else
  pnpm --filter "$PROJECT_NAME" package
fi

s3Bucket=`aws ssm get-parameter --name /account/services/artifact.bucket --query "Parameter.Value" --output text --profile membership --region eu-west-1`
s3Path="support/CODE/$PROJECT_NAME/$PROJECT_NAME.zip"
zipFile="./handlers/$PROJECT_NAME/target/$PROJECT_NAME.zip"

aws s3 cp $zipFile s3://$s3Bucket/$s3Path --profile membership --region eu-west-1

for fn in $function_names; do
  echo "Updating lambda $fn"
  aws lambda update-function-code \
    --function-name "${fn}CODE" \
    --s3-bucket $s3Bucket \
    --s3-key $s3Path \
    --profile membership \
    --region eu-west-1 \
    > /dev/null
done

echo "Update complete"