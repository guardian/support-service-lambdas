#!/bin/sh

# This script will build the cdk for the provided project and then call update-stack with the AWS Cli.
# It will fail if the stack does not already exist, in this case use create-stack
# Usage: ./update-stack.sh [project name]
# eg. ./update-stack.sh discount-api

# Exit if any of these commands fail
set -e

if [ $# -lt 1 ]; then
  echo "please provide the project name as an argument, eg. ./update-stack.sh discount-api"
  exit 2
fi

PROJECT_NAME="$1"
echo "Updating stack $PROJECT_NAME"

pnpm --filter cdk test-update && pnpm --filter cdk package

aws cloudformation update-stack \
  --capabilities '["CAPABILITY_AUTO_EXPAND", "CAPABILITY_NAMED_IAM", "CAPABILITY_IAM"]'  \
  --stack-name "membership-CODE-$PROJECT_NAME" \
  --template-body "file://cdk/cdk.out/$PROJECT_NAME-CODE.template.json" \
  --profile membership \
  --region eu-west-1 \
  > /dev/null

echo -e "\nStack update has been started, check progress in the AWS console.";
echo -e "https://eu-west-1.console.aws.amazon.com/cloudformation/home";