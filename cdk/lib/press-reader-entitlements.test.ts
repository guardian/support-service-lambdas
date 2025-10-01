import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
	supportApisDomain,
	supportCertificateId,
	supportHostedZoneId,
} from './constants';
import { PressReaderEntitlements } from './press-reader-entitlements';

describe('The Press reader entitlements stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new PressReaderEntitlements(
			app,
			'press-reader-entitlements-CODE',
			{
				stack: 'membership',
				stage: 'CODE',
				internalDomainName: `product-switch-api.code.${supportApisDomain}`,
				publicDomainName: 'press-reader-entitlements.code.dev-guardianapis.com',
				certificateId: supportCertificateId,
				hostedZoneId: supportHostedZoneId,
				supporterProductDataTable:
					'supporter-product-data-tables-CODE-SupporterProductDataTable',
			},
		);
		const prodStack = new PressReaderEntitlements(
			app,
			'press-reader-entitlements-PROD',
			{
				stack: 'membership',
				stage: 'PROD',
				internalDomainName: `product-switch-api.${supportApisDomain}`,
				publicDomainName: `press-reader-entitlements.guardianapis.com`,
				certificateId: supportCertificateId,
				hostedZoneId: supportHostedZoneId,
				supporterProductDataTable:
					'supporter-product-data-tables-PROD-SupporterProductDataTable',
			},
		);

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
