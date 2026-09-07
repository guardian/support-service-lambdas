import type { App } from 'aws-cdk-lib';
import { AllowPromoCodeTableQueryPolicy } from './cdk/policies';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class PromotionsApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'promotions-api' });

		const lambda = new SrApiLambda(this, 'Lambda', {
			lambdaOverrides: {
				description: 'A lambda that returns a list of v2 promotions',
			},
			monitoring: {
				errorImpact: 'callers may not be able to retrieve promotions data',
			},
			throttle: {
				rateLimit: 20,
				burstLimit: 10,
			},
		});

		lambda.addPolicies(new AllowPromoCodeTableQueryPolicy(this));
	}
}
