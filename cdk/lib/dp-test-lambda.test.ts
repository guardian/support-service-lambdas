import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DpTestLambda } from './dp-test-lambda';

describe('The dp-test-lambda stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new DpTestLambda(app, 'dp-test-lambda-CODE', {
			stack: 'support',
			stage: 'CODE',
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
	});
});
