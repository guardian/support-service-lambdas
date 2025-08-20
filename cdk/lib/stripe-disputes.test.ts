import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
	supportApisDomain,
	supportCertificateId,
	supportHostedZoneId,
} from '../bin/cdk';
import { StripeDisputes } from './stripe-disputes';

describe('The stripe disputes webhook API stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new StripeDisputes(app, 'stripe-disputes-CODE', {
			stack: 'membership',
			stage: 'CODE',
			domainName: `stripe-disputes.code.${supportApisDomain}`,
			hostedZoneId: supportHostedZoneId,
			certificateId: supportCertificateId,
		});
		const prodStack = new StripeDisputes(app, 'stripe-disputes-PROD', {
			stack: 'membership',
			stage: 'PROD',
			domainName: `stripe-disputes.${supportApisDomain}`,
			hostedZoneId: supportHostedZoneId,
			certificateId: supportCertificateId,
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
