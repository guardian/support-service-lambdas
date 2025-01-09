import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DiscountExpiryNotifier } from './discount-expiry-notifier';

describe('The discount-expiry-notifier stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new DiscountExpiryNotifier(
			app,
			'discount-expiry-notifier-CODE',
			{
				stack: 'membership',
				stage: 'CODE',
			},
		);
		const prodStack = new DiscountExpiryNotifier(
			app,
			'discount-expiry-notifier-PROD',
			{
				stack: 'membership',
				stage: 'PROD',
			},
		);

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
