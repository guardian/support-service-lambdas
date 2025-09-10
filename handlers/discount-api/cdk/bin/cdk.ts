import { DiscountApi } from '../lib/discount-api';
import { App } from 'aws-cdk-lib';

const app = new App();
export const supportHostedZoneId = 'Z3KO35ELNWZMSX';
export const supportCertificateId = 'b384a6a0-2f54-4874-b99b-96eeff96c009';
export const supportApisDomain = 'support.guardianapis.com';

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
