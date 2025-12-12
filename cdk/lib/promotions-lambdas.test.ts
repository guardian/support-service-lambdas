import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { PromotionsLambdas } from './promotions-lambdas';

describe('The Promotions lambdas stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new PromotionsLambdas(app, 'CODE');
		const prodStack = new PromotionsLambdas(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
