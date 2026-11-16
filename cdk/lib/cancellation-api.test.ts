import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CancellationApi } from './cancellation-api';

describe('The Cancellation api stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new CancellationApi(app, 'CODE');
		const prodStack = new CancellationApi(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
