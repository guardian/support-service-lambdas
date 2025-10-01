import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
	supportApisDomain,
	supportCertificateId,
	supportHostedZoneId,
} from './constants';
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
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
