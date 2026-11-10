import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SecurityGroupsUpdater } from './security-groups-updater';

describe('The SecurityGroupsUpdater stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new SecurityGroupsUpdater(app, 'CODE');
		const prodStack = new SecurityGroupsUpdater(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
