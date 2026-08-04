import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ScrubNonTokenisedPaymentMethods } from './scrub-non-tokenised-payment-methods';

describe('The ScrubNonTokenisedPaymentMethods stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new ScrubNonTokenisedPaymentMethods(
			app,
			`scrub-non-tokenised-payment-methods-CODE`,
			{ stack: 'support', stage: 'CODE' },
		);
		const prodStack = new ScrubNonTokenisedPaymentMethods(
			app,
			`scrub-non-tokenised-payment-methods-PROD`,
			{ stack: 'support', stage: 'PROD' },
		);
		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
