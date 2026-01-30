import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { PromotionsLambdas } from './promotions-lambdas';

describe('The Promotions lambdas stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new PromotionsLambdas(app, 'CODE', {
			oldPromoCampaignStreamLabel: '2025-12-17T11:57:50.933',
			oldPromoStreamLabel: '2023-04-28T14:57:20.201',
			newPromoStreamLabel: '2026-01-05T11:33:36.603',
		});
		const prodStack = new PromotionsLambdas(app, 'PROD', {
			oldPromoCampaignStreamLabel: '2025-12-17T11:57:59.560',
			oldPromoStreamLabel: '2016-06-01T13:26:09.654',
			newPromoStreamLabel: '2026-01-05T11:50:46.239',
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
