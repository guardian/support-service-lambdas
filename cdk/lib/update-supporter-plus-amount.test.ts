
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
	supportApisDomain,
	supportCertificateId,
	supportHostedZoneId,
} from '../bin/cdk';
import { UpdateSupporterPlusAmount } from './update-supporter-plus-amount';

describe('The Update supporter plus amount stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new UpdateSupporterPlusAmount(app, 'update-supporter-plus-amount-CODE', {
			stack: 'membership',
			stage: 'CODE',
			domainName: `update-supporter-plus-amount.code.${supportApisDomain}`,
			hostedZoneId: supportHostedZoneId,
			certificateId: supportCertificateId,
		});
		const prodStack = new UpdateSupporterPlusAmount(app, 'update-supporter-plus-amount-PROD', {
			stack: 'membership',
			stage: 'PROD',
			domainName: `update-supporter-plus-amount.${supportApisDomain}`,
			hostedZoneId: supportHostedZoneId,
			certificateId: supportCertificateId,
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
