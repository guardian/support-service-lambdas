
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AlarmsGchat } from './alarms-gchat';

describe('The Alarms gchat stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new AlarmsGchat(app, 'alarms-gchat-CODE', {
			stack: 'membership',
			stage: 'CODE',
		});
		const prodStack = new AlarmsGchat(app, 'alarms-gchat-PROD', {
			stack: 'membership',
			stage: 'PROD',
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
