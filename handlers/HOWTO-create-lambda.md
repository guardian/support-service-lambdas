# How to create a new Lambda
This document is a work in progress, please add edits/updates!
Hopefully we can make this process easier in future (code generation or ideally things would happen at build time)

## Important! Deploying a lambda with riffraff for the first time
1. preview the deploy using riffraff and only tick the "copy file to s3" step before hitting deploy
1. go back to the deploy screen and deploy as normal (all the steps)
1. set up [continuous deployment](https://riffraff.gutools.co.uk/deployment/continuous) for future deploys (optional)

## Typescript lambdas
### Api Gateway with a custom domain name
1. copy the discount-api lambda and the associated CDK file discount-api.ts
1. add the new project to [pnpm-workspace.yaml](https://github.com/guardian/support-service-lambdas/blob/647299d94b471d0065030bce692a4631078346bb/pnpm-workspace.yaml) so that it can be built from the root of the project
1. add the new project to [ci-typescript.yml](https://github.com/guardian/support-service-lambdas/blob/647299d94b471d0065030bce692a4631078346bb/.github/workflows/ci-typescript.yml)
1. delete all the code from the handler (index.ts) that you don't need
1. search and replace all sf-contact-merge in the code/packages/cdk with your chosen name
1. push the branch and deploy to code (see below)

## Scala lambdas
### Api Gateway with a custom domain name
1. copy the sf-contact-merge lambda
1. delete all the code from the handler that you don't need
1. search and replace all sf-contact-merge in the code/packages/cfn with your chosen name
1. change the ApiGatewayTargetDomainName for CODE and PROD to tbc.execute-api.eu-west-1.amazonaws.com
1. push the branch and deploy to code (see below)
1. look at the [custom domain name](https://eu-west-1.console.aws.amazon.com/apigateway/home?region=eu-west-1#/custom-domain-names) that was created by the deploy
1. look at the target domain name in the regional box (should start d-4765437.execute-api.eu-west-1.amazonaws.com or similar)
1. edit the ApiGatewayTargetDomainName to point to the target domain name
1. raise a PR with the PROD still showing tbc and get it merged
1. deploy to prod with riff-raff (see steps below)
1. follow the steps after "deploy to code" again in order to update the PROD domain name.
1. set up a health check job in Runscope (optional)

**IMPORTANT:** The `IntegrationHttpMethod` (between API Gateway with Lambda) needs to always be `POST` - see https://stackoverflow.com/a/55457240/5205022 for more information

**NOTE:** If you make subsequent configuration changes to the API Gateway (even via CloudFormation) you may need to manually 'Deploy API' which can be done via the AWS Console (API Gateway > _{gateway in question}_ > Resources > Actions ▼ > Deploy API)


