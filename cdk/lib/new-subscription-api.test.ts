import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { NewSubscriptionApi } from './new-subscription-api';

describe('The New Subscription API stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new NewSubscriptionApi(app, 'CODE');
		const prodStack = new NewSubscriptionApi(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
