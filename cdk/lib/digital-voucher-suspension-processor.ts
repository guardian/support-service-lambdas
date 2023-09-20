import type { GuStackProps } from "@guardian/cdk/lib/constructs/core";
import { GuStack } from "@guardian/cdk/lib/constructs/core";
import type { App } from "aws-cdk-lib";
import { CfnInclude } from "aws-cdk-lib/cloudformation-include";

export class DigitalVoucherSuspensionProcessor extends GuStack {
    constructor(scope: App, id: string, props: GuStackProps) {
        super(scope, id, props);
        const yamlTemplateFilePath = `${__dirname}/../../handlers/digital-voucher-suspension-processor/cfn-processed.yaml`;
        new CfnInclude(this, "YamlTemplate", {
            templateFile: yamlTemplateFilePath,
        });
    }
}
