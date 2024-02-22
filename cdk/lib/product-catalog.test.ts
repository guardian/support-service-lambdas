import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
	supportApisDomain,
	supportCertificateId,
	supportHostedZoneId,
} from '../bin/cdk';
import { ProductCatalog } from './product-catalog';

describe('The Product catalog stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new ProductCatalog(app, 'product-catalog-CODE', {
			stack: 'membership',
			stage: 'CODE',
		});
		const prodStack = new ProductCatalog(app, 'product-catalog-PROD', {
			stack: 'membership',
			stage: 'PROD',
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
