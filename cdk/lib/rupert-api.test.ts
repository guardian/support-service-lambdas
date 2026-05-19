import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { RupertApi } from './rupert-api';

describe('The Rupert api stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new RupertApi(app, 'CODE');
		const prodStack = new RupertApi(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
