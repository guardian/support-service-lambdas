import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { HolidayStopProcessor } from './holiday-stop-processor';

describe('The holiday stop processor stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new HolidayStopProcessor(app, 'CODE');
		const prodStack = new HolidayStopProcessor(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
