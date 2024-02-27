import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { StripeWebhookEndpoints } from "./stripe-webhook-endpoints";

describe("The StripeWebhookEndpoints stack", () => {
    it("matches the snapshot", () => {
        const app = new App();
        const stack = new StripeWebhookEndpoints(app, "StripeWebhookEndpoints", { stack: "membership", stage: "TEST" });
        const template = Template.fromStack(stack);
        expect(template.toJSON()).toMatchSnapshot();
    });
});