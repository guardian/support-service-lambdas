import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { StripeCheckoutSpike } from './stripe-checkout-spike';

describe('The StripeCheckoutSpike stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new StripeCheckoutSpike(
			app,
			`stripe-checkout-spike-CODE`,
			{
				stack: 'support',
				stage: 'CODE',
			},
		);
		const prodStack = new StripeCheckoutSpike(
			app,
			`stripe-checkout-spike-PROD`,
			{
				stack: 'support',
				stage: 'PROD',
			},
		);
		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
