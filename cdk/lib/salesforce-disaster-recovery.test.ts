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
			},
		);
		const prodStack = new SalesforceDisasterRecovery(
			app,
			`salesforce-disaster-recovery-PROD`,
			{
				stack: 'membership',
				stage: 'PROD',
			},
		);
		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
