import "source-map-support/register";
import { App } from "aws-cdk-lib";
import { NewProductApi } from "../lib/new-product-api";

const app = new App();
new NewProductApi(app, "new-product-api-CODE", { stack: "membership", stage: "CODE" });
new NewProductApi(app, "new-product-api-PROD", { stack: "membership", stage: "PROD" });
