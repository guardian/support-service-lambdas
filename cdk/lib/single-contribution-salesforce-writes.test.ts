import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
	APP_NAME,
	SingleContributionSalesforceWrites,
} from './single-contribution-salesforce-writes';

describe('The SingleContributionSalesforceWrites stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new SingleContributionSalesforceWrites(
			app,
			`${APP_NAME}-CODE`,
			{ stack: 'membership', stage: 'CODE' },
		);
		const prodStack = new SingleContributionSalesforceWrites(
			app,
			`${APP_NAME}-PROD`,
			{ stack: 'membership', stage: 'PROD' },
		);
		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
