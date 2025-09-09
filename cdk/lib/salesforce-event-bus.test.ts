import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SalesforceEventBus } from './salesforce-event-bus';

describe('The SalesforceEventBus stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new SalesforceEventBus(app, `salesforce-event-bus-CODE`, {
			stack: 'membership',
			stage: 'CODE',
		});
		const prodStack = new SalesforceEventBus(app, `salesforce-event-bus-PROD`, {
			stack: 'membership',
			stage: 'PROD',
		});
		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
