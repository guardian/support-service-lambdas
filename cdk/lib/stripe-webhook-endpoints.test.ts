import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { stripeWebhookEndpointsCodeProps, stripeWebhookEndpointsProdProps } from "../bin/cdk";
import { StripeWebhookEndpoints } from "./stripe-webhook-endpoints";

describe("The StripeWebhookEndpoints stack", () => {
    it("matches the snapshot", () => {
        const app = new App();
        // const stack = new StripeWebhookEndpoints(app, "StripeWebhookEndpoints", { stack: "membership", stage: "TEST" });

        const codeStack = new StripeWebhookEndpoints(app, "Stripe-Webhook-Endpoints-CODE",stripeWebhookEndpointsCodeProps);
        const prodStack = new StripeWebhookEndpoints(app, "Stripe-Webhook-Endpoints-PROD", stripeWebhookEndpointsProdProps);

        // const template = Template.fromStack(stack);
        // expect(template.toJSON()).toMatchSnapshot();

        expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
        expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();

    });
});