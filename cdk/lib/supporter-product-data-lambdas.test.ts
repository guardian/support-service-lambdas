import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SupporterProductDataLambdas } from './supporter-product-data-lambdas';

describe('The supporter-product-data-lambdas stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new SupporterProductDataLambdas(app, {
			app: 'supporter-product-data-lambdas',
			stack: 'support',
			stage: 'CODE',
			processItemMaxConcurrency: 30,
		});
		const prodStack = new SupporterProductDataLambdas(app, {
			app: 'supporter-product-data-lambdas',
			stack: 'support',
			stage: 'PROD',
			processItemMaxConcurrency: 50,
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
