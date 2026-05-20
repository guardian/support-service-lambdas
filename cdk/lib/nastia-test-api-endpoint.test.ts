import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { NastiaTestApiEndpoint } from './nastia-test-api-endpoint';

describe('The Nastia test api endpoint stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new NastiaTestApiEndpoint(app, 'CODE');
		const prodStack = new NastiaTestApiEndpoint(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
