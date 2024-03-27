#!/bin/sh

# This script will build the provided project, copy the zip file to S3 and then call
# `update-function-code` with the AWS Cli to update the lambda.
# Usage: ./update-lambda.sh [project name]
# eg. ./update-lambda.sh discount-api

# Exit if any of these commands fail
set -e

if [ $# -lt 1 ]; then
  echo "please provide the project name as an argument, eg. ./update-lambda.sh discount-api"
  exit 2
fi

PROJECT_NAME="$1"
echo "Updating lambda $PROJECT_NAME"

pnpm --filter $PROJECT_NAME package

s3Bucket="membership-dist"
s3Path="support/CODE/$PROJECT_NAME/$PROJECT_NAME.zip"
zipFile="./handlers/$PROJECT_NAME/target/$PROJECT_NAME.zip"

aws s3 cp $zipFile s3://$s3Bucket/$s3Path --profile membership --region eu-west-1
aws lambda update-function-code --function-name $PROJECT_NAME-CODE --s3-bucket $s3Bucket --s3-key $s3Path --profile membership --region eu-west-1 > /dev/null

echo "Update complete"