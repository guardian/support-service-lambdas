import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { JoeandrupertTestLambda } from './joeandrupert-test-lambda';

describe('The Joeandrupert test lambda stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new JoeandrupertTestLambda(app, 'CODE');
		const prodStack = new JoeandrupertTestLambda(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
