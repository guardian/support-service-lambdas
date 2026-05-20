import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { GaoTestLambda } from './gao-test-lambda';

describe('The Gao test lambda stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new GaoTestLambda(app, 'CODE');
		const prodStack = new GaoTestLambda(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
