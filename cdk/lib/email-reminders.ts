import type { App } from 'aws-cdk-lib';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class EmailReminders extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'email-reminders' });

		new SrApiLambda(this, 'Lambda', {
			lambdaOverrides: {
				description:
					'Receives Zuora callouts used to send reminder and notice emails to subscribers',
			},
			monitoring: {
				errorImpact:
					'a subscriber may not have been sent a legally required reminder or notice email',
			},
			// Zuora sends each scheduled event's callouts in a burst; 429s are retried by Zuora
			throttle: {
				rateLimit: 100,
				burstLimit: 200,
			},
		});
	}
}
