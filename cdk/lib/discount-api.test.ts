import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
	supportApisDomain,
	supportCertificateId,
	supportHostedZoneId,
} from '../bin/cdk';
import { DiscountApi } from './discount-api';

describe('The Discount API stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new DiscountApi(app, 'discount-api-CODE', {
			stack: 'membership',
			stage: 'CODE',
			domainName: `discount-api.code.${supportApisDomain}`,
			hostedZoneId: supportHostedZoneId,
			certificateId: supportCertificateId,
		});
		const prodStack = new DiscountApi(app, 'discount-api-PROD', {
			stack: 'membership',
			stage: 'PROD',
			domainName: `discount-api.${supportApisDomain}`,
			hostedZoneId: supportHostedZoneId,
			certificateId: supportCertificateId,
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
