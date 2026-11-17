import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { SrApiLambda } from './cdk/SrApiLambda';
import { SrLambda } from './cdk/SrLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class CancellationApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'cancellation-api' });

		const lambda = new SrApiLambda(this, 'Lambda', {
			lambdaOverrides: {
				description: 'Subscription cancellation preview and execute API',
				handler: 'cancel/index.handler',
			},
			monitoring: {
				errorImpact:
					'one or more users were not able to cancel their subscription online',
			},
			throttle: {
				rateLimit: 20,
				burstLimit: 10,
			},
		});
		lambda.addPublicPath('docs');
		lambda.addPublicPath('openapi.json');
		// Refund workflow Lambdas, see https://github.com/guardian/support-service-lambdas/issues/3942
		// Zuora billing calls can take ~60s, so allow plenty of headroom
		const refundLambdaTimeout = Duration.minutes(2);

		new SrLambda(this, 'CalculateRefundLambda', {
			nameSuffix: 'calculate-refund',
			lambdaOverrides: {
				description:
					'Refund workflow step: calculates the refund (or credit) for a cancelled subscription',
				handler: 'refund/handlers/calculateRefund.handler',
				timeout: refundLambdaTimeout,
			},
		});
	}
}
