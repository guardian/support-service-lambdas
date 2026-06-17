import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { AllowSqsSendPolicy } from './cdk/policies';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class SfMoveSubscriptionsApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, {
			stack: 'membership',
			stage,
			app: 'sf-move-subscriptions-api',
		});

		const lambda = new SrApiLambda(this, 'Lambda', {
			lambdaOverrides: {
				runtime: Runtime.JAVA_21,
				architecture: Architecture.ARM_64,
				fileName: 'sf-move-subscriptions-api.jar',
				handler: 'com.gu.sf.move.subscriptions.api.Handler::handle',
				memorySize: 1536,
				timeout: Duration.minutes(5),
				description: 'API for moving subscriptions between Salesforce accounts',
				// The handler reads sys.env("Stage"); guCDK only injects uppercase STAGE.
				environment: { Stage: stage },
			},
			monitoring: {
				errorImpact:
					'CSRs may be unable to move subscriptions between Salesforce accounts',
			},
		});

		lambda.addPolicies(
			AllowSqsSendPolicy.create(this, 'supporter-product-data'),
		);
	}
}
