import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SalesTaxApi } from './sales-tax-api';

describe('The Sales tax api stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new SalesTaxApi(app, 'CODE');
		const prodStack = new SalesTaxApi(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
