import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { StripeDisputes } from './stripe-disputes';

describe('The stripe disputes webhook API stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new StripeDisputes(app, 'CODE');
		const prodStack = new StripeDisputes(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
