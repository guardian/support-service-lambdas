
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
	supportApisDomain,
	supportCertificateId,
	supportHostedZoneId,
} from '../bin/cdk';
import { TestApi } from './test-api';

describe('The Test api stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new TestApi(app, 'test-api-CODE', {
			stack: 'membership',
			stage: 'CODE',
			domainName: `test-api.code.${supportApisDomain}`,
			hostedZoneId: supportHostedZoneId,
			certificateId: supportCertificateId,
		});
		const prodStack = new TestApi(app, 'test-api-PROD', {
			stack: 'membership',
			stage: 'PROD',
			domainName: `test-api.${supportApisDomain}`,
			hostedZoneId: supportHostedZoneId,
			certificateId: supportCertificateId,
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
