import type { App } from 'aws-cdk-lib';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class ObserverBenefitsApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'observer-benefits-api' });

		new SrApiLambda(this, 'Lambda', {
			lambdaOverrides: {
				description: 'Handles API requests for observer benefits',
			},
			monitoring: {
				errorImpact:
					'An eligible user may not be getting Observer digital benefits',
			},
		});
	}
}
