import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AcquisitionsBrazeSuppressionSync } from './acquisitions-braze-suppression-sync';

describe('The Acquisitions braze suppression sync stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new AcquisitionsBrazeSuppressionSync(app, 'CODE');
		const prodStack = new AcquisitionsBrazeSuppressionSync(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
