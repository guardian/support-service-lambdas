#!/bin/sh

# This script will build the lambda and cdk for the provided project, upload the lambda package to S3,
# and then call create-stack with the AWS Cli. It will fail if the stack already exists,
# in this case use update-stack.
# Usage: ./create-stack.sh [project name]
# eg. ./create-stack.sh discount-api

# Exit if any of these commands fail
set -e

if [ $# -lt 1 ]; then
  echo "please provide the project name as an argument, eg. ./create-stack.sh discount-api"
  exit 2
fi

PROJECT_NAME="$1"
echo "Creating stack $PROJECT_NAME"

echo "Building lambda package"
pnpm --filter $PROJECT_NAME package

s3Bucket=`aws ssm get-parameter --name /account/services/artifact.bucket --query "Parameter.Value" --output text --profile membership --region eu-west-1`
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
  --tags Key=Stage,Value=CODE Key=App,Value=$PROJECT_NAME Key=Stack,Value=support\
  --template-body "file://cdk/cdk.out/$PROJECT_NAME-CODE.template.json" \
  --profile membership \
  --region eu-west-1 \
  > /dev/null

echo -e "\nStack update has been started, check progress in the AWS console.";
echo -e "https://eu-west-1.console.aws.amazon.com/cloudformation/home";