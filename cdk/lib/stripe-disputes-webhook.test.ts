import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
	supportApisDomain,
	supportCertificateId,
	supportHostedZoneId,
} from '../bin/cdk';
import { StripeDisputesWebhook } from './stripe-disputes-webhook';

describe('The stripe disputes webhook API stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new StripeDisputesWebhook(
			app,
			'stripe-disputes-webhook-CODE',
			{
				stack: 'membership',
				stage: 'CODE',
				domainName: `stripe-disputes-webhook.code.${supportApisDomain}`,
				hostedZoneId: supportHostedZoneId,
				certificateId: supportCertificateId,
			},
		);
		const prodStack = new StripeDisputesWebhook(
			app,
			'stripe-disputes-webhook-PROD',
			{
				stack: 'membership',
				stage: 'PROD',
				domainName: `stripe-disputes-webhook.${supportApisDomain}`,
				hostedZoneId: supportHostedZoneId,
				certificateId: supportCertificateId,
			},
		);

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
