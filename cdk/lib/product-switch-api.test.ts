import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
	supportApisDomain,
	supportCertificateId,
	supportHostedZoneId,
} from '../bin/cdk';
import { ProductSwitchApi } from './product-switch-api';

describe('The Product switch api stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new ProductSwitchApi(app, 'product-switch-api-CODE', {
			stack: 'membership',
			stage: 'CODE',
			domainName: `product-switch-api.code.${supportApisDomain}`,
			hostedZoneId: supportHostedZoneId,
			certificateId: supportCertificateId,
		});
		const prodStack = new ProductSwitchApi(app, 'product-switch-api-PROD', {
			stack: 'membership',
			stage: 'PROD',
			domainName: `product-switch-api.${supportApisDomain}`,
			hostedZoneId: supportHostedZoneId,
			certificateId: supportCertificateId,
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
