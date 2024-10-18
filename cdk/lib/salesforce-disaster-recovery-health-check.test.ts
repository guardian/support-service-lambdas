import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SalesforceDisasterRecoveryHealthCheck } from './salesforce-disaster-recovery-health-check';

describe('The Salesforce disaster recovery health check stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new SalesforceDisasterRecoveryHealthCheck(
			app,
			'salesforce-disaster-recovery-health-check-CODE',
			{
				stack: 'membership',
				stage: 'CODE',
			},
		);
		const prodStack = new SalesforceDisasterRecoveryHealthCheck(
			app,
			'salesforce-disaster-recovery-health-check-PROD',
			{
				stack: 'membership',
				stage: 'PROD',
			},
		);

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
