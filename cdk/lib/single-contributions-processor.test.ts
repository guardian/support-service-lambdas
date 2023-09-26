import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
	APP_NAME,
	SingleContributionsProcessor,
} from './single-contributions-processor';

describe('The SingleContributionsProcessor stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new SingleContributionsProcessor(
			app,
			`${APP_NAME}-CODE`,
			{ stack: 'membership', stage: 'CODE' },
		);
		const prodStack = new SingleContributionsProcessor(
			app,
			`${APP_NAME}-PROD`,
			{ stack: 'membership', stage: 'PROD' },
		);
		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
