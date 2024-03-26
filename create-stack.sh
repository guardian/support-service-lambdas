#!/bin/sh

# Exit if any of these commands fail
set -e

PROJECT_NAME="$1"
echo "Creating stack $PROJECT_NAME"

pnpm --filter cdk package

aws cloudformation create-stack \
  --capabilities '["CAPABILITY_AUTO_EXPAND", "CAPABILITY_NAMED_IAM", "CAPABILITY_IAM"]'  \
  --stack-name "support-CODE-$PROJECT_NAME" \
  --template-body "file://cdk/cdk.out/$PROJECT_NAME-CODE.template.json" \
  --profile membership \
  > /dev/null

echo -e "\nStack update has been started, check progress in the AWS console.";
echo -e "https://eu-west-1.console.aws.amazon.com/cloudformation/home";