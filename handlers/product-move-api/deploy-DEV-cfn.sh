#!/bin/sh

# Exit if any of these commands fail, print commands to console
set -ex

aws cloudformation update-stack \
  --capabilities '["CAPABILITY_AUTO_EXPAND", "CAPABILITY_NAMED_IAM", "CAPABILITY_IAM"]'  \
  --stack-name membership-CODE-product-move-api \
  --template-body file://cfn.yaml \
  --parameters  ParameterKey=Stage,ParameterValue=CODE \
  --profile membership

echo -e "\nStack update has been started, check progress in the AWS console.";
echo -e "https://eu-west-1.console.aws.amazon.com/cloudformation/home";
