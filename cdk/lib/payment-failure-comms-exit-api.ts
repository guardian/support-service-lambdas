import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class PaymentFailureCommsExitApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'payment-failure-comms-exit-api' });

		new SrApiLambda(this, 'Lambda', {
			lambdaOverrides: {
				description:
					'Sends a pf_csr_exit custom event to Braze for a customer Identity ID',
				architecture: Architecture.ARM_64,
				timeout: Duration.seconds(15),
			},
			monitoring: {
				errorImpact:
					'a customer may remain in payment-failure communications after a CSR attempts to stop them',
				alarmDescription:
					'payment-failure-comms-exit-api returned a 5XX response. Quick triage: check the Lambda logs for the Identity ID context, validate the IDAPI lookup returned a brazeUuid, then inspect the Braze /users/track response.',
			},
			throttle: {
				rateLimit: 20,
				burstLimit: 10,
			},
		});
	}
}
