import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { PaulTestLambda } from './paul-test-lambda';

describe('The Paul test lambda stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new PaulTestLambda(app, 'CODE');
		const prodStack = new PaulTestLambda(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
