import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SfMoveSubscriptionsApi } from './sf-move-subscriptions-api';

describe('The sf-move-subscriptions-api stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new SfMoveSubscriptionsApi(app, 'CODE');
		const prodStack = new SfMoveSubscriptionsApi(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
