import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MetricPushApi } from './metric-push-api';

describe('The MetricPushApi stack', () => {
	it('matches the snapshot', () => {
		const app = new App();

		const codeStack = new MetricPushApi(app, 'metric-push-api-CODE', {
			stack: 'membership',
			stage: 'CODE',
			cloudFormationStackName: 'membership-CODE-metric-push-api',
		});
		const prodStack = new MetricPushApi(app, 'metric-push-api-PROD', {
			stack: 'membership',
			stage: 'PROD',
			cloudFormationStackName: 'membership-PROD-metric-push-api',
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
