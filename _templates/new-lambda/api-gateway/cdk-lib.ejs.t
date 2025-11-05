---
# This template creates a CDK definition for the new lambda

to: cdk/lib/<%=lambdaName%>.ts
sh: git add cdk/lib/<%=lambdaName%>.ts
---
<% PascalCase = h.changeCase.pascal(lambdaName) %>
import type { App } from 'aws-cdk-lib';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class <%= PascalCase %> extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: '<%= lambdaName %>' });

		new SrApiLambda(this, 'Lambda', {
        			legacyId: `${this.app}-lambda`,
        			lambdaOverrides: {
        				description:
        					'A lambda that enables the addition of discounts to existing subscriptions',
        			},
        			monitoring: {
        				errorImpact:
        					'an eligible user may not have been offered a discount during the cancellation flow',
        			},
        			<% if (includeApiKey === 'Y'){ %>
        			isPublic: true,
        			<% } %>
        		});
    }
}
