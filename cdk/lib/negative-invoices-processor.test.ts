import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { NegativeInvoicesProcessor } from './negative-invoices-processor';

describe('The negative-invoices-processor stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new NegativeInvoicesProcessor(
			app,
			'negative-invoices-processor-CODE',
			{
				stack: 'support',
				stage: 'CODE',
			},
		);
		const prodStack = new NegativeInvoicesProcessor(
			app,
			'negative-invoices-processor-PROD',
			{
				stack: 'support',
				stage: 'PROD',
			},
		);

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
