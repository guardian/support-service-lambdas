import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ProductSwitchApi } from './product-switch-api';

describe('The Product switch api stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new ProductSwitchApi(app, 'product-switch-api-CODE', {
			stack: 'support',
			stage: 'CODE',
		});
		const prodStack = new ProductSwitchApi(app, 'product-switch-api-PROD', {
			stack: 'support',
			stage: 'PROD',
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
