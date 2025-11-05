import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ObserverDigitalBenefits } from './observer-digital-benefits';

describe('The Observer digital benefits stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new ObserverDigitalBenefits(app, 'CODE');
		const prodStack = new ObserverDigitalBenefits(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
