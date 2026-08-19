import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DeliveryProblemCreditProcessor } from './delivery-problem-credit-processor';

describe('The delivery problem credit processor stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new DeliveryProblemCreditProcessor(app, 'CODE');
		const prodStack = new DeliveryProblemCreditProcessor(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
