import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { IdentityDeletionCleanup } from './identity-deletion-cleanup';

describe('The identity deletion cleanup stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new IdentityDeletionCleanup(app, 'CODE');
		const prodStack = new IdentityDeletionCleanup(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
