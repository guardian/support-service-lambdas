import {GuStack, GuStackProps} from "@guardian/cdk/lib/constructs/core";
import {App} from "aws-cdk-lib";
import {CfnInclude} from "aws-cdk-lib/cloudformation-include";

export class BatchEmailSender extends GuStack {
    constructor(scope: App, id: string, props: GuStackProps) {
        super(scope, id, props);
        const yamlTemplateFilePath = `${__dirname}/../../handlers/batch-email-sender/cfn.yaml`;
        new CfnInclude(this, "YamlTemplate", {
            templateFile: yamlTemplateFilePath,
        });
    }
}