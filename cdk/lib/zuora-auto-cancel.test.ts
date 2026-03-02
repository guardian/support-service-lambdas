import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ZuoraAutoCancel } from './zuora-auto-cancel';

describe('The zuora-auto-cancel stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new ZuoraAutoCancel(app, 'CODE');
		const prodStack = new ZuoraAutoCancel(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
