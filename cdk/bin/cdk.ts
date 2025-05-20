import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { AlarmsHandler } from '../lib/alarms-handler';
import { BatchEmailSender } from '../lib/batch-email-sender';
import { CancellationSfCasesApi } from '../lib/cancellation-sf-cases-api';
import { DiscountApi } from '../lib/discount-api';
import { DiscountExpiryNotifier } from '../lib/discount-expiry-notifier';
import { GenerateProductCatalog } from '../lib/generate-product-catalog';
import { MetricPushApi } from '../lib/metric-push-api';
import type { NewProductApiProps } from '../lib/new-product-api';
import { NewProductApi } from '../lib/new-product-api';
import { ObserverDataExport } from '../lib/observer-data-export';
import { PressReaderEntitlements } from '../lib/press-reader-entitlements';
import { ProductSwitchApi } from '../lib/product-switch-api';
import { SalesforceDisasterRecovery } from '../lib/salesforce-disaster-recovery';
import { SalesforceDisasterRecoveryHealthCheck } from '../lib/salesforce-disaster-recovery-health-check';
import {
	APP_NAME as SINGLE_CONTRIBUTION_SALESFORCE_WRITES_APP_NAME,
	SingleContributionSalesforceWrites,
} from '../lib/single-contribution-salesforce-writes';
import { SoftOptInConsentSetter } from '../lib/soft-opt-in-consent-setter';
import type { StripeWebhookEndpointsProps } from '../lib/stripe-webhook-endpoints';
import { StripeWebhookEndpoints } from '../lib/stripe-webhook-endpoints';
import { TicketTailorWebhook } from '../lib/ticket-tailor-webhook';
import { UpdateSupporterPlusAmount } from '../lib/update-supporter-plus-amount';
import { UserBenefits } from '../lib/user-benefits';
import { ZuoraSalesforceLinkRemover } from '../lib/zuora-salesforce-link-remover';

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

new SoftOptInConsentSetter(app, 'soft-opt-in-consent-setter-CODE', {
	mobileAccountIdSSMParam: 'mobileAccountId',
	schedule: 'rate(30 minutes)',
	acquisitionsEventBusArn:
		'arn:aws:events:eu-west-1:865473395570:event-bus/acquisitions-bus-CODE',
	stack: 'membership',
	stage: 'CODE',
});
new SoftOptInConsentSetter(app, 'soft-opt-in-consent-setter-PROD', {
	mobileAccountIdSSMParam: 'mobileAccountId',
	schedule: 'rate(30 minutes)',
	acquisitionsEventBusArn:
		'arn:aws:events:eu-west-1:865473395570:event-bus/acquisitions-bus-PROD',
	stack: 'membership',
	stage: 'PROD',
});

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
	salesforceApiDomain: 'https://gnmtouchpoint--dev1.sandbox.my.salesforce.com',
	salesforceApiConnectionResourceId:
		'salesforce-disaster-recovery-CODE-salesforce-api/c8d71d2e-9101-439d-a3e2-d8fa7e6b155f',
	salesforceOauthSecretName:
		'events!connection/salesforce-disaster-recovery-CODE-salesforce-api/e2792d75-414a-48f3-89a1-5e8eac15f627',
	salesforceQueryWaitSeconds: 1,
});
new SalesforceDisasterRecovery(app, 'salesforce-disaster-recovery-CSBX', {
	stack: 'membership',
	stage: 'CSBX',
	salesforceApiDomain:
		'https://gnmtouchpoint--partial24.sandbox.my.salesforce.com',
	salesforceApiConnectionResourceId:
		'salesforce-disaster-recovery-CSBX-salesforce-api/c8d71d2e-9101-439d-a3e2-d8fa7e6b155f',
	salesforceOauthSecretName:
		'events!connection/salesforce-disaster-recovery-CSBX-salesforce-api/56d7692d-e186-4b5a-9745-9d0a7ce33f1b',
	salesforceQueryWaitSeconds: 1,
});
new SalesforceDisasterRecovery(app, 'salesforce-disaster-recovery-PROD', {
	stack: 'membership',
	stage: 'PROD',
	salesforceApiDomain: 'https://gnmtouchpoint.my.salesforce.com',
	salesforceApiConnectionResourceId:
		'salesforce-disaster-recovery-PROD-salesforce-api/e6e43d71-2fd7-45cf-a051-0e901dbd170e',
	salesforceOauthSecretName:
		'events!connection/salesforce-disaster-recovery-PROD-salesforce-api/583f9d1a-7244-453e-9bb9-ca2639ef27d3',
	salesforceQueryWaitSeconds: 30,
});
new GenerateProductCatalog(app, 'generate-product-catalog-CODE', {
	stack: 'support',
	stage: 'CODE',
	domainName: 'product-catalog.code.dev-guardianapis.com',
});
new GenerateProductCatalog(app, 'generate-product-catalog-PROD', {
	stack: 'support',
	stage: 'PROD',
	domainName: 'product-catalog.guardianapis.com',
});

export const stripeWebhookEndpointsCodeProps: StripeWebhookEndpointsProps = {
	stack: 'membership',
	stage: 'CODE',
	certificateId: membershipCertificateId,
	domainName: `stripe-webhook-endpoints-code.${membershipApisDomain}`,
	hostedZoneId: membershipHostedZoneId,
};
export const stripeWebhookEndpointsProdProps: StripeWebhookEndpointsProps = {
	stack: 'membership',
	stage: 'PROD',
	certificateId: membershipCertificateId,
	domainName: `stripe-webhook-endpoints-prod.${membershipApisDomain}`,
	hostedZoneId: membershipHostedZoneId,
};

new StripeWebhookEndpoints(
	app,
	'stripe-webhook-endpoints-CODE',
	stripeWebhookEndpointsCodeProps,
);
new StripeWebhookEndpoints(
	app,
	'stripe-webhook-endpoints-PROD',
	stripeWebhookEndpointsProdProps,
);

new ProductSwitchApi(app, 'product-switch-api-CODE', {
	stack: 'support',
	stage: 'CODE',
	domainName: `product-switch-api-code.${supportApisDomain}`,
	hostedZoneId: supportHostedZoneId,
	certificateId: supportCertificateId,
});
new ProductSwitchApi(app, 'product-switch-api-PROD', {
	stack: 'support',
	stage: 'PROD',
	domainName: `product-switch-api.${supportApisDomain}`,
	hostedZoneId: supportHostedZoneId,
	certificateId: supportCertificateId,
});

new AlarmsHandler(app, 'alarms-handler-CODE', {
	stack: 'support',
	stage: 'CODE',
});
new AlarmsHandler(app, 'alarms-handler-PROD', {
	stack: 'support',
	stage: 'PROD',
});
new SalesforceDisasterRecoveryHealthCheck(
	app,
	'salesforce-disaster-recovery-health-check-CODE',
	{
		stack: 'membership',
		stage: 'CODE',
	},
);
new SalesforceDisasterRecoveryHealthCheck(
	app,
	'salesforce-disaster-recovery-health-check-PROD',
	{
		stack: 'membership',
		stage: 'PROD',
	},
);
new UpdateSupporterPlusAmount(app, 'update-supporter-plus-amount-CODE', {
	stack: 'support',
	stage: 'CODE',
	domainName: `update-supporter-plus-amount-code.${supportApisDomain}`,
	hostedZoneId: supportHostedZoneId,
	certificateId: supportCertificateId,
});
new UpdateSupporterPlusAmount(app, 'update-supporter-plus-amount-PROD', {
	stack: 'support',
	stage: 'PROD',
	domainName: `update-supporter-plus-amount.${supportApisDomain}`,
	hostedZoneId: supportHostedZoneId,
	certificateId: supportCertificateId,
});
new ZuoraSalesforceLinkRemover(app, 'zuora-salesforce-link-remover-CODE', {
	stack: 'membership',
	stage: 'CODE',
});
new ZuoraSalesforceLinkRemover(app, 'zuora-salesforce-link-remover-PROD', {
	stack: 'membership',
	stage: 'PROD',
});
new TicketTailorWebhook(app, 'ticket-tailor-webhook-CODE', {
	stack: 'support',
	stage: 'CODE',
});
new TicketTailorWebhook(app, 'ticket-tailor-webhook-PROD', {
	stack: 'support',
	stage: 'PROD',
});
new PressReaderEntitlements(app, 'press-reader-entitlements-CODE', {
	stack: 'support',
	stage: 'CODE',
	internalDomainName: `press-reader-entitlements-code.${supportApisDomain}`,
	publicDomainName: 'press-reader-entitlements.code.dev-guardianapis.com',
	hostedZoneId: supportHostedZoneId,
	certificateId: supportCertificateId,
	supporterProductDataTable:
		'supporter-product-data-tables-CODE-SupporterProductDataTable',
});
new PressReaderEntitlements(app, 'press-reader-entitlements-PROD', {
	stack: 'support',
	stage: 'PROD',
	internalDomainName: `press-reader-entitlements.${supportApisDomain}`,
	publicDomainName: 'press-reader-entitlements.guardianapis.com',
	hostedZoneId: supportHostedZoneId,
	certificateId: supportCertificateId,
	supporterProductDataTable:
		'supporter-product-data-tables-PROD-SupporterProductDataTable',
});
new UserBenefits(app, 'user-benefits-CODE', {
	stack: 'support',
	stage: 'CODE',
	internalDomainName: `user-benefits-code.${supportApisDomain}`,
	publicDomainName: 'user-benefits.code.dev-guardianapis.com',
	hostedZoneId: supportHostedZoneId,
	certificateId: supportCertificateId,
	supporterProductDataTable:
		'supporter-product-data-tables-CODE-SupporterProductDataTable',
});
new UserBenefits(app, 'user-benefits-PROD', {
	stack: 'support',
	stage: 'PROD',
	internalDomainName: `user-benefits.${supportApisDomain}`,
	publicDomainName: 'user-benefits.guardianapis.com',
	hostedZoneId: supportHostedZoneId,
	certificateId: supportCertificateId,
	supporterProductDataTable:
		'supporter-product-data-tables-PROD-SupporterProductDataTable',
});
new DiscountExpiryNotifier(app, 'discount-expiry-notifier-CODE', {
	stack: 'support',
	stage: 'CODE',
});
new DiscountExpiryNotifier(app, 'discount-expiry-notifier-PROD', {
	stack: 'support',
	stage: 'PROD',
});
new MetricPushApi(app, 'metric-push-api-CODE', {
	stack: 'membership',
	stage: 'CODE',
	cloudFormationStackName: 'membership-CODE-metric-push-api',
});
new MetricPushApi(app, 'metric-push-api-PROD', {
	stack: 'membership',
	stage: 'PROD',
	cloudFormationStackName: 'membership-PROD-metric-push-api',
});
new ObserverDataExport(app, 'observer-data-export-CODE', {
	stack: 'support',
	stage: 'CODE',
});
new ObserverDataExport(app, 'observer-data-export-PROD', {
	stack: 'support',
	stage: 'PROD',
});
