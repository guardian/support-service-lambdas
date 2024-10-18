---
# This template creates a CDK test file for the new lambda

to: cdk/lib/<%=lambdaName%>.test.ts
sh: git add cdk/lib/<%=lambdaName%>.test.ts
---
<% PascalCase = h.changeCase.pascal(lambdaName) %>
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { <%= PascalCase %> } from './<%= lambdaName %>';

describe('The <%= h.changeCase.sentenceCase(lambdaName) %> stack', () => {
	it('matches the snapshot', () => {
		const app = new App();
		const codeStack = new <%= PascalCase %>(app, '<%= lambdaName %>-CODE', {
			stack: 'membership',
			stage: 'CODE',
			domainName: `<%= lambdaName %>.code.dev-guardianapis.com`,
		});
		const prodStack = new <%= PascalCase %>(app, '<%= lambdaName %>-PROD', {
			stack: 'membership',
			stage: 'PROD',
			domainName: `<%= lambdaName %>.guardianapis.com`,
		});

		expect(Template.fromStack(codeStack).toJSON()).toMatchSnapshot();
		expect(Template.fromStack(prodStack).toJSON()).toMatchSnapshot();
	});
});
