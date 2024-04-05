import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AlarmsHandler } from './alarms-handler';

describe('The alarms-handler stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new AlarmsHandler(app, 'alarms-handler-CODE', {
			stack: 'membership',
			stage: 'CODE',
		});
		const prodStack = new AlarmsHandler(app, 'alarms-handler-PROD', {
			stack: 'membership',
			stage: 'PROD',
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
