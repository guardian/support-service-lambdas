import {GuStack, GuStackProps} from "@guardian/cdk/lib/constructs/core";
import {App} from "aws-cdk-lib";

export interface BatchEmailSenderProps extends GuStackProps {}

export class BatchEmailSender extends GuStack {
    constructor(scope: App, id: string, props: BatchEmailSenderProps) {
        super(scope, id, props);
    }
}
