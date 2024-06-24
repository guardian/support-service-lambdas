import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ZuoraSalesforceLinkRemover } from './zuora-salesforce-link-remover';

describe('The zuora-salesforce-link-remover stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new ZuoraSalesforceLinkRemover(app, 'zuora-salesforce-link-remover-CODE', {
			stack: 'membership',
			stage: 'CODE',
		});
		const prodStack = new ZuoraSalesforceLinkRemover(app, 'zuora-salesforce-link-remover-PROD', {
			stack: 'membership',
			stage: 'PROD',
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
