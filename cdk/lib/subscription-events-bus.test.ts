import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SubscriptionEventsBus } from './subscription-events-bus';

describe('The SubscriptionEventsBus stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new SubscriptionEventsBus(app, `CODE`);
		const prodStack = new SubscriptionEventsBus(app, `PROD`);
		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
