import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { BrazeAcquisitionEventsSync } from './braze-acquisition-events-sync';

describe('The braze acquisition events sync stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new BrazeAcquisitionEventsSync(app, 'CODE');
		const prodStack = new BrazeAcquisitionEventsSync(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
