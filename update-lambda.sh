#!/bin/sh

# Exit if any of these commands fail
set -e

PROJECT_NAME="$1"
echo "Updating lambda $PROJECT_NAME"

pnpm --filter $PROJECT_NAME package

s3Bucket="membership-dist"
s3Path="support/CODE/$PROJECT_NAME/$PROJECT_NAME.zip"
zipFile="./handlers/$PROJECT_NAME/target/$PROJECT_NAME.zip"

aws s3 cp $zipFile s3://$s3Bucket/$s3Path --profile membership --region eu-west-1
aws lambda update-function-code --function-name $PROJECT_NAME-CODE --s3-bucket $s3Bucket --s3-key $s3Path --profile membership --region eu-west-1 > /dev/null

echo "Update complete"