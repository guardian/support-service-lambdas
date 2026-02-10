import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ImovoVoucherApi } from './imovo-voucher-api';

describe('The Imovo voucher API stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new ImovoVoucherApi(app, 'CODE');
		const prodStack = new ImovoVoucherApi(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
