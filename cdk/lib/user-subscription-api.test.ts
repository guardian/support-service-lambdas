import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { UserSubscriptionApi } from './user-subscription-api';

describe('The User subscription api stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new UserSubscriptionApi(app, 'CODE');
		const prodStack = new UserSubscriptionApi(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
