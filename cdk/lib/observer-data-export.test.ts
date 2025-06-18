import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ObserverDataExport } from './observer-data-export';

describe('The ObserverDataExport stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new ObserverDataExport(app, `observer-data-export-CODE`, {
			stack: 'support',
			stage: 'CODE',
		});
		const prodStack = new ObserverDataExport(app, `observer-data-export-PROD`, {
			stack: 'support',
			stage: 'PROD',
		});
		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
