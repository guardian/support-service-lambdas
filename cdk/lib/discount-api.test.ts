import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DiscountApi } from './discount-api';

describe('The Discount API stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new DiscountApi(app, 'discount-api-CODE', {
			stack: 'support',
			stage: 'CODE',
		});
		const prodStack = new DiscountApi(app, 'discount-api-PROD', {
			stack: 'support',
			stage: 'PROD',
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
