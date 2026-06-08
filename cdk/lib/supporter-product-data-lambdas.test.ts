import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SupporterProductDataLambdas } from './supporter-product-data-lambdas';

describe('The supporter-product-data-lambdas stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new SupporterProductDataLambdas(app, 'CODE');
		const prodStack = new SupporterProductDataLambdas(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
