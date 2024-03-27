#!/bin/sh

# Exit if any of these commands fail
set -e

PROJECT_NAME="$1"
echo "Creating stack $PROJECT_NAME"

echo "Building lambda package"
pnpm --filter $PROJECT_NAME package

s3Bucket="membership-dist"
s3Path="support/CODE/$PROJECT_NAME/$PROJECT_NAME.zip"
zipFile="./handlers/$PROJECT_NAME/target/$PROJECT_NAME.zip"

echo "Copying lambda package to S3"
aws s3 cp $zipFile s3://$s3Bucket/$s3Path --profile membership --region eu-west-1

echo "Building CDK"
pnpm --filter cdk package

echo "Creating stack"
aws cloudformation create-stack \
  --capabilities '["CAPABILITY_AUTO_EXPAND", "CAPABILITY_NAMED_IAM", "CAPABILITY_IAM"]'  \
  --stack-name "support-CODE-$PROJECT_NAME" \
  --template-body "file://cdk/cdk.out/$PROJECT_NAME-CODE.template.json" \
  --profile membership \
  > /dev/null

echo -e "\nStack update has been started, check progress in the AWS console.";
echo -e "https://eu-west-1.console.aws.amazon.com/cloudformation/home";