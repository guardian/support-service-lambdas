
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
	supportApisDomain,
	supportCertificateId,
	supportHostedZoneId,
} from '../bin/cdk';
import { TestLambda } from './test-lambda';

describe('The Test lambda stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new TestLambda(app, 'test-lambda-CODE', {
			stack: 'membership',
			stage: 'CODE',
			domainName: `test-lambda.code.${supportApisDomain}`,
			hostedZoneId: supportHostedZoneId,
			certificateId: supportCertificateId,
		});
		const prodStack = new TestLambda(app, 'test-lambda-PROD', {
			stack: 'membership',
			stage: 'PROD',
			domainName: `test-lambda.${supportApisDomain}`,
			hostedZoneId: supportHostedZoneId,
			certificateId: supportCertificateId,
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
