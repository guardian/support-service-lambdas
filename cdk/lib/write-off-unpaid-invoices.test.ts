import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { WriteOffUnpaidInvoices } from './write-off-unpaid-invoices';

describe('The WriteOffUnpaidInvoices stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const csbxStack = new WriteOffUnpaidInvoices(
			app,
			`write-off-unpaid-invoices-CSBX`,
			{ stack: 'support', stage: 'CSBX' },
		);
		const prodStack = new WriteOffUnpaidInvoices(
			app,
			`write-off-unpaid-invoices-PROD`,
			{ stack: 'support', stage: 'PROD' },
		);
		expect(Template.fromStack(csbxStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
