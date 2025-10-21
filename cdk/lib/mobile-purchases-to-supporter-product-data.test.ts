import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MobilePurchasesToSupporterProductData } from './mobile-purchases-to-supporter-product-data';

describe('The MobilePurchasesToSupporterProductData stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new MobilePurchasesToSupporterProductData(app, 'CODE');
		const prodStack = new MobilePurchasesToSupporterProductData(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
