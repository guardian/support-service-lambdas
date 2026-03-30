import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SupporterProductDataTS } from './supporter-product-data-ts';

describe('The supporter-product-data-ts stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new SupporterProductDataTS(
			app,
			'supporter-product-data-ts-CODE',
			{
				stack: 'support',
				stage: 'CODE',
				cloudFormationStackName: 'SupporterProductDataTS-CODE',
				processItemMaxConcurrency: 30,
			},
		);
		const prodStack = new SupporterProductDataTS(
			app,
			'supporter-product-data-ts-PROD',
			{
				stack: 'support',
				stage: 'PROD',
				cloudFormationStackName: 'SupporterProductDataTS-PROD',
				processItemMaxConcurrency: 50,
			},
		);

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
