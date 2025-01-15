import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
	supportApisDomain,
	supportCertificateId,
	supportHostedZoneId,
} from '../bin/cdk';
import { UserBenefits } from './user-benefits';

describe('The User benefits stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new UserBenefits(app, 'user-benefits-CODE', {
			stack: 'membership',
			stage: 'CODE',
			internalDomainName: `user-benefits.code.${supportApisDomain}`,
			publicDomainName: 'user-benefits.code.dev-guardianapis.com',
			hostedZoneId: supportHostedZoneId,
			certificateId: supportCertificateId,
			supporterProductDataTable:
				'supporter-product-data-tables-CODE-SupporterProductDataTable',
			corsAllowOrigins: [
				'https://m.code.dev-theguardian.com',
				'https://profile.code.dev-theguardian.com',
				'https://profile.thegulocal.com',
				'https://m.thegulocal.com',
				'https://support.code.dev-theguardian.com',
				'https://support.thegulocal.com',
			],
		});
		const prodStack = new UserBenefits(app, 'user-benefits-PROD', {
			stack: 'membership',
			stage: 'PROD',
			internalDomainName: `user-benefits.${supportApisDomain}`,
			publicDomainName: 'user-benefits.guardianapis.com',
			hostedZoneId: supportHostedZoneId,
			certificateId: supportCertificateId,
			supporterProductDataTable:
				'supporter-product-data-tables-PROD-SupporterProductDataTable',
			corsAllowOrigins: [
				'https://www.theguardian.com',
				'https://interactive.guim.co.uk',
				'https://membership.theguardian.com',
				'https://profile.theguardian.com',
				'https://support.theguardian.com',
			],
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
