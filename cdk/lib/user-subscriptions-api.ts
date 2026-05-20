import type { App } from 'aws-cdk-lib';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class UserSubscriptionsApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'user-subscriptions-api' });

		new SrApiLambda(this, 'Lambda', {
			lambdaOverrides: {
				description:
					'A lambda that efficiently returns detailed user subscription information for account overview',
			},
			monitoring: {
				errorImpact:
					'users may be receiving errors or missing information on manage their account',
			},
			// TODO work out what this means
			// throttle: {
			// 	rateLimit: 20,
			// 	burstLimit: 10,
			// },
		});
	}
}
