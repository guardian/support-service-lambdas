# CDK TypeScript project to generate CloudFormation yaml files

The `cdk.json` file tells the CDK Toolkit how to execute the app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

 ## To generate cfn.yaml

 `stack=<your-stack/api/project-name> npm run synth`

 that will create `cfn.yaml` file in `support-service-lambdas/handlers/<your-project-name>/cfn.yaml`

 ## To generate cfn.yaml in all projects

 ` ./generate_cfn_templates.sh`
