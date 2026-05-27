import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SupporterProductDataLambdas } from './supporter-product-data-lambdas';

describe('The supporter-product-data-lambdas stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new SupporterProductDataLambdas(
			app,
			'supporter-product-data-lambdas-CODE',
			{
				stack: 'support',
				stage: 'CODE',
				cloudFormationStackName: 'SupporterProductDataLambdas-CODE',
				processItemMaxConcurrency: 30,
			},
		);
		const prodStack = new SupporterProductDataLambdas(
			app,
			'supporter-product-data-lambdas-PROD',
			{
				stack: 'support',
				stage: 'PROD',
				cloudFormationStackName: 'SupporterProductDataLambdas-PROD',
				processItemMaxConcurrency: 50,
			},
		);

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
