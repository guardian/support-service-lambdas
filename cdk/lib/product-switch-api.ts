import type { App } from 'aws-cdk-lib';
import {
	AllowSqsSendPolicy,
	AllowZuoraOAuthSecretsPolicy,
} from './cdk/policies';
import { SrApiLambda } from './cdk/SrApiLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class ProductSwitchApi extends SrStack {
	readonly app: string;
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'product-switch-api' });

		const app = this.app;

		const lambda = new SrApiLambda(this, 'Lambda', {
			legacyId: `${this.app}-lambda`,
			lambdaOverrides: {
				description:
					'An API Gateway triggered lambda for carrying out product switches. Code is in the support-service-lambdas repo',
			},
			apiDescriptionOverride: `API Gateway endpoint for the ${app}-${this.stage} lambda`,
			errorImpact: 'readers could not get through the switch journey in MMA',
		});

		lambda.addPolicies(
			new AllowZuoraOAuthSecretsPolicy(this),
			new AllowSqsSendPolicy(
				this,
				`braze-emails`,
				'supporter-product-data',
				'product-switch-salesforce-tracking',
			),
		);
	}
}
