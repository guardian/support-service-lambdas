import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
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
				domainName: `press-reader-entitlements.code.dev-guardianapis.com`,
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
				domainName: `press-reader-entitlements.guardianapis.com`,
				supporterProductDataTable:
					'supporter-product-data-tables-PROD-SupporterProductDataTable',
			},
		);

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
