import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { GenerateProductCatalog } from './generate-product-catalog';

describe('The Product catalog stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new GenerateProductCatalog(app, 'product-catalog-CODE', {
			stack: 'membership',
			stage: 'CODE',
			domainName: 'product-catalog.code.dev-guardianapis.com',
		});
		const prodStack = new GenerateProductCatalog(app, 'product-catalog-PROD', {
			stack: 'membership',
			stage: 'PROD',
			domainName: 'product-catalog.guardianapis.com',
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
