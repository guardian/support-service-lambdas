import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SalesforceDisasterRecovery } from './salesforce-disaster-recovery';

describe('The SalesforceDisasterRecovery stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new SalesforceDisasterRecovery(
			app,
			`salesforce-disaster-recovery-CODE`,
			{
				stack: 'membership',
				stage: 'CODE',
				salesforceApiDomain:
					'https://gnmtouchpoint--dev1.sandbox.my.salesforce.com',
				salesforceApiConnectionResourceId:
					'salesforce-disaster-recovery-CODE-salesforce-api/c8d71d2e-9101-439d-a3e2-d8fa7e6b155f',
				salesforceQueryWaitSeconds: 1,
			},
		);
		const prodStack = new SalesforceDisasterRecovery(
			app,
			`salesforce-disaster-recovery-PROD`,
			{
				stack: 'membership',
				stage: 'PROD',
				salesforceApiDomain: 'https://gnmtouchpoint.my.salesforce.com',
				salesforceApiConnectionResourceId:
					'salesforce-disaster-recovery-PROD-salesforce-api/e6e43d71-2fd7-45cf-a051-0e901dbd170e',
				salesforceQueryWaitSeconds: 30,
			},
		);
		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
