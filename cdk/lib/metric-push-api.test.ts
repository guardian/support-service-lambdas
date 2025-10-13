import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MetricPushApi } from './metric-push-api';

describe('The MetricPushApi stack', () => {
	it('matches the snapshot', () => {
		const app = new App();

		const codeStack = new MetricPushApi(app, 'CODE');
		const prodStack = new MetricPushApi(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
