import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SlotSpend } from './slot-spend';

describe('The slot-spend stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new SlotSpend(app, 'slot-spend-CODE', {
			stack: 'support',
			stage: 'CODE',
		});
		const prodStack = new SlotSpend(app, 'slot-spend-PROD', {
			stack: 'support',
			stage: 'PROD',
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
