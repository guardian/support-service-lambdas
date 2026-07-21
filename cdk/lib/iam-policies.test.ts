import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { IamPolicies } from './iam-policies';

describe('The IamPolicies stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new IamPolicies(app, `CODE`);
		const prodStack = new IamPolicies(app, `PROD`);
		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
