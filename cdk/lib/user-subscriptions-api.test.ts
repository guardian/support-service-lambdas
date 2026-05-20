import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { UserSubscriptionsApi } from './user-subscriptions-api';

describe('The User subscription api stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new UserSubscriptionsApi(app, 'CODE');
		const prodStack = new UserSubscriptionsApi(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
