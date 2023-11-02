import "source-map-support/register";
import { App } from "aws-cdk-lib";
import { BatchEmailSender } from "../lib/batch-email-sender";
import {CancellationSfCasesApi} from "../lib/cancellation-sf-cases-api";
import type { NewProductApiProps } from "../lib/new-product-api";
import { NewProductApi } from "../lib/new-product-api";
import { APP_NAME as SINGLE_CONTRIBUTION_SALESFORCE_WRITES_APP_NAME, SingleContributionSalesforceWrites } from "../lib/single-contribution-salesforce-writes";

const app = new App();
const hostedZoneId = "Z1E4V12LQGXFEC"
const certificateId = "c1efc564-9ff8-4a03-be48-d1990a3d79d2"

export const codeProps: NewProductApiProps = {
    stack: "membership",
    stage: "CODE",
    domainName: "new-product-api-code.membership.guardianapis.com",
    hostedZoneId,
    certificateId,
    apiGatewayTargetDomainName: "d-ecyddyj7nk.execute-api.eu-west-1.amazonaws.com",
    zuoraCatalogLocation: "arn:aws:s3:::gu-zuora-catalog/CODE/Zuora-UAT/catalog.json",
    fulfilmentDateCalculatorS3Resource: "arn:aws:s3:::fulfilment-date-calculator-code/*"
};
export const prodProps: NewProductApiProps = {
    stack: "membership",
    stage: "PROD",
    domainName: "new-product-api-prod.membership.guardianapis.com",
    hostedZoneId,
    certificateId,
    apiGatewayTargetDomainName: "d-yyh9pmqphi.execute-api.eu-west-1.amazonaws.com",
    zuoraCatalogLocation: "arn:aws:s3:::gu-zuora-catalog/PROD/Zuora-PROD/catalog.json",
    fulfilmentDateCalculatorS3Resource: "arn:aws:s3:::fulfilment-date-calculator-prod/*"
};

new BatchEmailSender(app, "batch-email-sender-CODE", {
    domainName: "batch-email-sender-code.membership.guardianapis.com",
    hostedZoneId,
    certificateId,
    stack: "membership",
    stage: "CODE"
});
new BatchEmailSender(app, "batch-email-sender-PROD", {
    domainName: "batch-email-sender-prod.membership.guardianapis.com",
    hostedZoneId,
    certificateId,
    stack: "membership",
    stage: "PROD"
});

new CancellationSfCasesApi(app, "cancellation-sf-cases-api-CODE", {
    stack: "membership",
    stage: "CODE",
    domainName: "cancellation-sf-cases-api-code.guardianapis.com",
    certificateId,
    hostedZoneId,
});
new CancellationSfCasesApi(app, "cancellation-sf-cases-api-PROD", {
    stack: "membership",
    stage: "PROD",
    domainName: "cancellation-sf-cases-api-prod.guardianapis.com",
    certificateId,
    hostedZoneId,
});

new NewProductApi(app, "new-product-api-CODE", codeProps);
new NewProductApi(app, "new-product-api-PROD", prodProps);
new SingleContributionSalesforceWrites(app, `${SINGLE_CONTRIBUTION_SALESFORCE_WRITES_APP_NAME}-CODE`, {stack: "membership", stage: "CODE"})
new SingleContributionSalesforceWrites(app, `${SINGLE_CONTRIBUTION_SALESFORCE_WRITES_APP_NAME}-PROD`, {stack: "membership", stage: "PROD"})
