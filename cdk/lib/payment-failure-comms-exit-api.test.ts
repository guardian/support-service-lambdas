import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { PaymentFailureCommsExitApi } from './payment-failure-comms-exit-api';

describe('The Payment failure comms exit api stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new PaymentFailureCommsExitApi(app, 'CODE');
		const prodStack = new PaymentFailureCommsExitApi(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
