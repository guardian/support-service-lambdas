
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
	supportApisDomain,
	supportCertificateId,
	supportHostedZoneId,
} from '../bin/cdk';
import { AlarmsGchat } from './alarms-gchat';

describe('The Alarms gchat stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new AlarmsGchat(app, 'alarms-gchat-CODE', {
			stack: 'membership',
			stage: 'CODE',
			domainName: `alarms-gchat.code.${supportApisDomain}`,
			hostedZoneId: supportHostedZoneId,
			certificateId: supportCertificateId,
		});
		const prodStack = new AlarmsGchat(app, 'alarms-gchat-PROD', {
			stack: 'membership',
			stage: 'PROD',
			domainName: `alarms-gchat.${supportApisDomain}`,
			hostedZoneId: supportHostedZoneId,
			certificateId: supportCertificateId,
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
