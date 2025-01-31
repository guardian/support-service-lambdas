import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MetricPushApi } from './metric-push-api';

describe('The MetricPushApi stack', () => {
	it('matches the snapshot', () => {
		const app = new App();

		const codeStack = new MetricPushApi(app, 'metric-push-api-CODE', {
			stack: 'support',
			stage: 'CODE',
		});
		const prodStack = new MetricPushApi(app, 'metric-push-api-PROD', {
			stack: 'support',
			stage: 'PROD',
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
