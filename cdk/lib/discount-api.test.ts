import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { certificateId, hostedZoneId, membershipApisDomain } from '../bin/cdk';
import { DiscountApi } from './discount-api';

describe('The Acquisition Events API stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new DiscountApi(app, 'discount-api-CODE', {
			stack: 'membership',
			stage: 'CODE',
			domainName: `discount-api.code.${membershipApisDomain}`,
			hostedZoneId,
			certificateId,
		});
		const prodStack = new DiscountApi(app, 'discount-api-PROD', {
			stack: 'membership',
			stage: 'PROD',
			domainName: `discount-api.${membershipApisDomain}`,
			hostedZoneId,
			certificateId,
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
