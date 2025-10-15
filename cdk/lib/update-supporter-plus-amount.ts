import type { App } from 'aws-cdk-lib';
import {
	AllowSqsSendPolicy,
	AllowZuoraOAuthSecretsPolicy,
} from './cdk/policies';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class UpdateSupporterPlusAmount extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, {
			stage,
			app: 'update-supporter-plus-amount',
		});

		const lambda = new SrApiLambda(this, 'Lambda', {
			lambdaOverrides: {
				description:
					'An API Gateway triggered lambda to carry out supporter plus amount updates',
			},
			errorImpact:
				'a user could not update the contribution amount of their supporter plus subscription',
		});

		lambda.addPolicies(
			new AllowZuoraOAuthSecretsPolicy(this),
			new AllowSqsSendPolicy(this, 'braze-emails', 'supporter-product-data'),
		);
	}
}
