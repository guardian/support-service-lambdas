import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { UserBenefits } from './user-benefits';

describe('The User benefits stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new UserBenefits(app, 'CODE');
		const prodStack = new UserBenefits(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
