import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MetricPushApi } from './metric-push-api';

describe('The MetricPushApi stack', () => {
	it('matches the snapshot', () => {
		const app = new App();

		const codeStack = new MetricPushApi(
			app,
			'CODE',
			'membership-CODE-metric-push-api',
		);
		const prodStack = new MetricPushApi(
			app,
			'PROD',
			'membership-PROD-metric-push-api',
		);

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
