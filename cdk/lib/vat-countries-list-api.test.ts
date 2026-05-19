import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { VatCountriesListApi } from './vat-countries-list-api';

describe('The Vat countries list api stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new VatCountriesListApi(app, 'CODE');
		const prodStack = new VatCountriesListApi(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
