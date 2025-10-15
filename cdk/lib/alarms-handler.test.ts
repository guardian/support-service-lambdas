import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AlarmsHandler } from './alarms-handler';

describe('The alarms-handler stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new AlarmsHandler(app, 'CODE');
		const prodStack = new AlarmsHandler(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
