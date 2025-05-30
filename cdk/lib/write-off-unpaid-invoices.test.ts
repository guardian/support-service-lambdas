import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { WriteOffUnpaidInvoices } from './write-off-unpaid-invoices';

describe('The WriteOffUnpaidInvoices stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new WriteOffUnpaidInvoices(
			app,
			`write-off-unpaid-invoices-CODE`,
			{ stack: 'support', stage: 'CODE' },
		);
		const prodStack = new WriteOffUnpaidInvoices(
			app,
			`write-off-unpaid-invoices-PROD`,
			{ stack: 'support', stage: 'PROD' },
		);
		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
