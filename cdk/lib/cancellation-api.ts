import type { App } from 'aws-cdk-lib';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class CancellationApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'cancellation-api' });

		const lambda = new SrApiLambda(this, 'Lambda', {
			lambdaOverrides: {
				description: 'Subscription cancellation preview and execute API',
			},
			monitoring: {
				errorImpact: 'one or more users were not able to cancel their subscription online',
			},
			throttle: {
				rateLimit: 20,
				burstLimit: 10,
			},
		});
		lambda.addPublicPath('docs');
		lambda.addPublicPath('openapi.json');
	}
}
