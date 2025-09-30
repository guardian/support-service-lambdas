import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { UpdateSupporterPlusAmount } from './update-supporter-plus-amount';

describe('The Update supporter plus amount stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new UpdateSupporterPlusAmount(
			app,
			'update-supporter-plus-amount-CODE',
			{
				stack: 'support',
				stage: 'CODE',
			},
		);
		const prodStack = new UpdateSupporterPlusAmount(
			app,
			'update-supporter-plus-amount-PROD',
			{
				stack: 'support',
				stage: 'PROD',
			},
		);

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
