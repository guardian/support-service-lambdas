import type { App } from 'aws-cdk-lib';
import {
	AllowS3CatalogReadPolicy,
	AllowSqsSendPolicy,
	AllowZuoraOAuthSecretsPolicy,
} from './cdk/policies';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class DiscountApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'discount-api' });

		const lambda = new SrApiLambda(this, 'Lambda', {
			legacyId: `${this.app}-lambda`,
			lambdaOverrides: {
				description:
					'A lambda that enables the addition of discounts to existing subscriptions',
			},
			errorImpact:
				'an eligible user may not have been offered a discount during the cancellation flow',
		});

		lambda.addPolicies(
			new AllowS3CatalogReadPolicy(this),
			new AllowZuoraOAuthSecretsPolicy(this),
			new AllowSqsSendPolicy(this, `braze-emails`),
		);
	}
}
