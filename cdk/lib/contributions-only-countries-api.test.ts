import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ContributionsOnlyCountriesApi } from './contributions-only-countries-api';

describe('The contributions-only countries list api stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new ContributionsOnlyCountriesApi(app, 'CODE');
		const prodStack = new ContributionsOnlyCountriesApi(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
