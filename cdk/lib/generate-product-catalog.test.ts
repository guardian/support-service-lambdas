import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { GenerateProductCatalog } from './generate-product-catalog';

describe('The generate product catalog stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new GenerateProductCatalog(app, 'CODE');
		const prodStack = new GenerateProductCatalog(app, 'PROD');

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
