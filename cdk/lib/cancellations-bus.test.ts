import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CancellationsBus } from './cancellations-bus';

describe('The CancellationsBus stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new CancellationsBus(app, `CODE`);
		const prodStack = new CancellationsBus(app, `PROD`);
		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
