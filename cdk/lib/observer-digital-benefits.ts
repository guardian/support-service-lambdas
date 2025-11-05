import type { App } from 'aws-cdk-lib';
import { AllowSupporterProductDataQueryPolicy } from './cdk/policies';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class ObserverDigitalBenefits extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'observer-digital-benefits' });

		const lambda = new SrApiLambda(this, 'Lambda', {
			legacyId: `${this.app}-lambda`,
			lambdaOverrides: {
				description:
					'A lambda that enables the addition of discounts to existing subscriptions',
			},
			monitoring: {
				errorImpact:
					'an eligible user may not have been offered a discount during the cancellation flow',
			},

			isPublic: false,
		});
		lambda.addPolicies(new AllowSupporterProductDataQueryPolicy(this));
	}
}
