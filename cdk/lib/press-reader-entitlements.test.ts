import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { PressReaderEntitlements } from './press-reader-entitlements';

describe('The Press reader entitlements stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new PressReaderEntitlements(app, 'CODE');
		const prodStack = new PressReaderEntitlements(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
