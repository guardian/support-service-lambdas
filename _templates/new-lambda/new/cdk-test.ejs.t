---
to: cdk/lib/<%=lambdaName%>.test.ts
---
<% PascalCase = h.changeCase.pascal(lambdaName) %>
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
	supportApisDomain,
	supportCertificateId,
	supportHostedZoneId,
} from '../bin/cdk';
import { <%= PascalCase %> } from './<%= lambdaName %>';

describe('The <%= h.changeCase.sentenceCase(lambdaName) %> stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new <%= PascalCase %>(app, '<%= lambdaName %>-CODE', {
			stack: 'membership',
			stage: 'CODE',
			domainName: `<%= lambdaName %>.code.${supportApisDomain}`,
			hostedZoneId: supportHostedZoneId,
			certificateId: supportCertificateId,
		});
		const prodStack = new <%= PascalCase %>(app, '<%= lambdaName %>-PROD', {
			stack: 'membership',
			stage: 'PROD',
			domainName: `<%= lambdaName %>.${supportApisDomain}`,
			hostedZoneId: supportHostedZoneId,
			certificateId: supportCertificateId,
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
