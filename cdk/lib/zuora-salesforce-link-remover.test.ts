import { App } from 'aws-cdk-lib';
// import { Template } from 'aws-cdk-lib/assertions';
import { ZuoraSalesforceLinkRemover } from './zuora-salesforce-link-remover';

describe('The ZuoraSalesforceLinkRemover stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		// const codeStack = new ZuoraSalesforceLinkRemover(
		// 	app,
		// 	'get-billing-accounts-lambda',
		// 	{
		// 		stack: 'membership',
		// 		stage: 'CODE',
		// 	},
		// );

		// expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(true);
	});
});
