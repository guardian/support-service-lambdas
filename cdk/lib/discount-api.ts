import type { App } from 'aws-cdk-lib';
import {
	AllowS3CatalogReadPolicy,
	AllowSqsSendPolicy,
	AllowZuoraOAuthSecretsPolicy,
} from './cdk/policies';
import { SrApiLambda } from './cdk/sr-api-lambda';
import type { SrStageNames } from './cdk/sr-stack';
import { SrStack } from './cdk/sr-stack';

export class DiscountApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'discount-api' });

		const lambda = new SrApiLambda(this, {
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
