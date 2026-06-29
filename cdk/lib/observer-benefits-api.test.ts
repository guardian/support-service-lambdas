import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ObserverBenefitsApi } from './observer-benefits-api';

describe('The Observer benefits api stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new ObserverBenefitsApi(app, 'CODE');
		const prodStack = new ObserverBenefitsApi(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
