# CDK TypeScript project to generate CloudFormation yaml files

The `cdk.json` file tells the CDK Toolkit how to execute the app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

 ## To generate cdk-cfn.yaml

 `stack=<your-app-name> npm run synth`

 that will create `cdk-cfn.yaml` file in `support-service-lambdas/handlers/<your-project-name>/cdk-cfn.yaml`

 ## To generate cdk-cfn.yaml in all projects

 ` ./generate_cfn_templates.sh`

 ## How to add a new stack

 - add typescript code in `cdk/lib/` directory in `<app-name>-stack.ts` format
 - add new stack instance in `cdk/bin/` example ```new TestAppStack(app, 'test-app');```
 - add unit tests in `cdk/test/` directory
 - add `generate_cfn_templates.sh` script main function a entry:
 -- `build_cfn_template "<app-name>"` app name need to match the handler folder name
