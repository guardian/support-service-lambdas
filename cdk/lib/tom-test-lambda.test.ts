import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { TomTestLambda } from './tom-test-lambda';

describe('The Tom test lambda stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new TomTestLambda(app, 'CODE');
		const prodStack = new TomTestLambda(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
