import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { PromotionsLambdas } from './promotions-lambdas';

describe('The Promotions lambdas stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new PromotionsLambdas(app, 'CODE', {
			newPromoStreamLabel: '2026-01-05T11:33:36.603',
		});
		const prodStack = new PromotionsLambdas(app, 'PROD', {
			newPromoStreamLabel: '2026-01-05T11:50:46.239',
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
