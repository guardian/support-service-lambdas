import type { App } from 'aws-cdk-lib';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class SalesTaxApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'sales-tax-api' });

		new SrApiLambda(this, 'Lambda', {
			lambdaOverrides: {
				description: 'Handles API requests for state or province sales tax',
			},
			monitoring: {
				errorImpact: 'An eligible state or province may not get sales tax',
			},
			throttle: {
				rateLimit: 20,
				burstLimit: 10,
			},
		});
	}
}
