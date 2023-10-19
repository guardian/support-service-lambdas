import type {GuStackProps} from "@guardian/cdk/lib/constructs/core";
import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import {BatchEmailSender} from "./batch-email-sender";

const codeProps: GuStackProps = {
    stack: "membership",
    stage: "CODE"
}

const prodProps: GuStackProps = {
    stack: "membership",
    stage: "PROD"
}

describe("The BatchEmailSender stack", () => {
    it("matches the snapshot", () => {
        const app = new App();
        const codeStack = new BatchEmailSender(
            app,
            "batch-email-sender-CODE",
            codeProps
        );
        const prodStack = new BatchEmailSender(
            app,
            "batch-email-sender-PROD",
            prodProps
        );
        expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
        expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
    });
});
