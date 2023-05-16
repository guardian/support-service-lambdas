import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { NewProductApi } from "./new-product-api";

describe("The NewProductApi stack", () => {
  it("matches the snapshot", () => {
    const app = new App();
    const stack = new NewProductApi(app, "NewProductApi", { stack: "membership", stage: "TEST" });
    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });
});
