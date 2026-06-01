import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MultipleAccountApi } from './multiple-account-api';

describe('The Multiple account api stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new MultipleAccountApi(app, 'CODE');
		const prodStack = new MultipleAccountApi(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
