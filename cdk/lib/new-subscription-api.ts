import type { App } from 'aws-cdk-lib';
import {
	AllowPromoCodeTableQueryPolicy,
	AllowS3CatalogReadPolicy,
	AllowZuoraOAuthSecretsPolicy,
} from './cdk/policies';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class NewSubscriptionApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'new-subscription-api' });

		const lambda = new SrApiLambda(this, 'Lambda', {
			legacyId: `${this.app}-lambda`,
			lambdaOverrides: {
				description:
					'A lambda that creates new Zuora subscriptions, replacing the new-product-api',
			},
			monitoring: {
				errorImpact: 'CSRs may not be able to create new subscriptions',
			},
		});

		lambda.addPolicies(
			new AllowZuoraOAuthSecretsPolicy(this),
			new AllowS3CatalogReadPolicy(this),
			new AllowPromoCodeTableQueryPolicy(this),
		);
	}
}
