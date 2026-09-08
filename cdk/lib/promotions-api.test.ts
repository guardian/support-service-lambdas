import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { PromotionsApi } from './promotions-api';

describe('The Promotions api stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new PromotionsApi(app, 'CODE');
		const prodStack = new PromotionsApi(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
