import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { StaffAccess } from './staff-access';

describe('The Staff Access stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new StaffAccess(app, 'CODE');
		const prodStack = new StaffAccess(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
