import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { GrahamTestLambda } from './graham-test-lambda';

describe('The Graham test lambda stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new GrahamTestLambda(app, 'CODE');
		const prodStack = new GrahamTestLambda(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
