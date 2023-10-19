import "source-map-support/register";
import { App } from "aws-cdk-lib";
import { BatchEmailSender } from "../lib/batch-email-sender";
import { FailedNationalDeliveriesProcessor } from "../lib/failed-national-deliveries-processor";
import type { NewProductApiProps } from "../lib/new-product-api";
import { NewProductApi } from "../lib/new-product-api";
import { APP_NAME as SINGLE_CONTRIBUTION_SALESFORCE_WRITES_APP_NAME, SingleContributionSalesforceWrites } from "../lib/single-contribution-salesforce-writes";

const app = new App();

export const codeProps: NewProductApiProps = {
    stack: "membership",
    stage: "CODE",
    domainName: "new-product-api-code.membership.guardianapis.com",
    hostedZoneId: "Z1E4V12LQGXFEC",
    certificateId: "c1efc564-9ff8-4a03-be48-d1990a3d79d2",
    apiGatewayTargetDomainName: "d-ecyddyj7nk.execute-api.eu-west-1.amazonaws.com",
    zuoraCatalogLocation: "arn:aws:s3:::gu-zuora-catalog/CODE/Zuora-UAT/catalog.json",
    fulfilmentDateCalculatorS3Resource: "arn:aws:s3:::fulfilment-date-calculator-code/*"
};

export const prodProps: NewProductApiProps = {
    stack: "membership",
    stage: "PROD",
    domainName: "new-product-api-prod.membership.guardianapis.com",
    hostedZoneId: "Z1E4V12LQGXFEC",
    certificateId: "c1efc564-9ff8-4a03-be48-d1990a3d79d2",
    apiGatewayTargetDomainName: "d-yyh9pmqphi.execute-api.eu-west-1.amazonaws.com",
    zuoraCatalogLocation: "arn:aws:s3:::gu-zuora-catalog/PROD/Zuora-PROD/catalog.json",
    fulfilmentDateCalculatorS3Resource: "arn:aws:s3:::fulfilment-date-calculator-prod/*"
};

new BatchEmailSender(app, "batch-email-sender-CODE", {stack: "membership", stage: "CODE"});
new BatchEmailSender(app, "batch-email-sender-PROD", {stack: "membership", stage: "PROD"});
new NewProductApi(app, "new-product-api-CODE", codeProps);
new NewProductApi(app, "new-product-api-PROD", prodProps);
new FailedNationalDeliveriesProcessor(app, "failed-national-deliveries-processor-CODE", {stack: "membership", stage: "CODE"});
new FailedNationalDeliveriesProcessor(app, "failed-national-deliveries-processor-PROD", {stack: "membership", stage: "PROD"});
new SingleContributionSalesforceWrites(app, `${SINGLE_CONTRIBUTION_SALESFORCE_WRITES_APP_NAME}-CODE`, {stack: "membership", stage: "CODE"})
new SingleContributionSalesforceWrites(app, `${SINGLE_CONTRIBUTION_SALESFORCE_WRITES_APP_NAME}-PROD`, {stack: "membership", stage: "PROD"})
