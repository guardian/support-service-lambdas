import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { BatchEmailSender } from '../lib/batch-email-sender';
import { CancellationSfCasesApi } from '../lib/cancellation-sf-cases-api';
import { DiscountApi } from '../lib/discount-api';
import type { NewProductApiProps } from '../lib/new-product-api';
import { NewProductApi } from '../lib/new-product-api';
import {
	APP_NAME as SINGLE_CONTRIBUTION_SALESFORCE_WRITES_APP_NAME,
	SingleContributionSalesforceWrites,
} from '../lib/single-contribution-salesforce-writes';
import { SalesforceDisasterRecovery } from '../lib/salesforce-disaster-recovery';

const app = new App();
const membershipHostedZoneId = 'Z1E4V12LQGXFEC';
const membershipCertificateId = 'c1efc564-9ff8-4a03-be48-d1990a3d79d2';
const membershipApisDomain = 'membership.guardianapis.com';
export const supportHostedZoneId = 'Z3KO35ELNWZMSX';
export const supportCertificateId = 'b384a6a0-2f54-4874-b99b-96eeff96c009';
export const supportApisDomain = 'support.guardianapis.com';

export const codeProps: NewProductApiProps = {
	stack: 'membership',
	stage: 'CODE',
	domainName: `new-product-api-code.${membershipApisDomain}`,
	hostedZoneId: membershipHostedZoneId,
	certificateId: membershipCertificateId,
	apiGatewayTargetDomainName:
		'd-ecyddyj7nk.execute-api.eu-west-1.amazonaws.com',
	zuoraCatalogLocation:
		'arn:aws:s3:::gu-zuora-catalog/CODE/Zuora-UAT/catalog.json',
	fulfilmentDateCalculatorS3Resource:
		'arn:aws:s3:::fulfilment-date-calculator-code/*',
};
export const prodProps: NewProductApiProps = {
	stack: 'membership',
	stage: 'PROD',
	domainName: `new-product-api-prod.${membershipApisDomain}`,
	hostedZoneId: membershipHostedZoneId,
	certificateId: membershipCertificateId,
	apiGatewayTargetDomainName:
		'd-yyh9pmqphi.execute-api.eu-west-1.amazonaws.com',
	zuoraCatalogLocation:
		'arn:aws:s3:::gu-zuora-catalog/PROD/Zuora-PROD/catalog.json',
	fulfilmentDateCalculatorS3Resource:
		'arn:aws:s3:::fulfilment-date-calculator-prod/*',
};

new BatchEmailSender(app, 'batch-email-sender-CODE', {
	stack: 'membership',
	stage: 'CODE',
	domainName: `batch-email-sender-code.${membershipApisDomain}`,
	hostedZoneId: membershipHostedZoneId,
	certificateId: membershipCertificateId,
});
new BatchEmailSender(app, 'batch-email-sender-PROD', {
	stack: 'membership',
	stage: 'PROD',
	domainName: `batch-email-sender-prod.${membershipApisDomain}`,
	hostedZoneId: membershipHostedZoneId,
	certificateId: membershipCertificateId,
});

new CancellationSfCasesApi(app, 'cancellation-sf-cases-api-CODE', {
	stack: 'membership',
	stage: 'CODE',
});
new CancellationSfCasesApi(app, 'cancellation-sf-cases-api-PROD', {
	stack: 'membership',
	stage: 'PROD',
});

new NewProductApi(app, 'new-product-api-CODE', codeProps);
new NewProductApi(app, 'new-product-api-PROD', prodProps);

new SingleContributionSalesforceWrites(
	app,
	`${SINGLE_CONTRIBUTION_SALESFORCE_WRITES_APP_NAME}-CODE`,
	{ stack: 'membership', stage: 'CODE' },
);
new SingleContributionSalesforceWrites(
	app,
	`${SINGLE_CONTRIBUTION_SALESFORCE_WRITES_APP_NAME}-PROD`,
	{ stack: 'membership', stage: 'PROD' },
);

new DiscountApi(app, 'discount-api-CODE', {
	stack: 'support',
	stage: 'CODE',
	domainName: `discount-api-code.${supportApisDomain}`,
	hostedZoneId: supportHostedZoneId,
	certificateId: supportCertificateId,
});
new DiscountApi(app, 'discount-api-PROD', {
	stack: 'support',
	stage: 'PROD',
	domainName: `discount-api.${supportApisDomain}`,
	hostedZoneId: supportHostedZoneId,
	certificateId: supportCertificateId,
});

new SalesforceDisasterRecovery(app, 'salesforce-disaster-recovery-CODE', {
	stack: 'membership',
	stage: 'CODE',
});
new SalesforceDisasterRecovery(app, 'salesforce-disaster-recovery-PROD', {
	stack: 'membership',
	stage: 'PROD',
});
