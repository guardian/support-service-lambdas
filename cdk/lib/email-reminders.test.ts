import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { EmailReminders } from './email-reminders';

describe('The Email reminders stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new EmailReminders(app, 'CODE');
		const prodStack = new EmailReminders(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
