import type { App } from 'aws-cdk-lib';
import {
	AllowSqsSendPolicy,
	AllowZuoraOAuthSecretsPolicy,
} from './cdk/policies';
import { SrRestApi } from './cdk/sr-rest-api';
import type { SrStageNames } from './cdk/sr-stack';
import { SrStack } from './cdk/sr-stack';

export class ProductSwitchApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stack: 'support', stage, app: 'product-switch-api' });

		new SrRestApi(this, {
			lambdaDesc:
				'An API Gateway triggered lambda for carrying out product switches. Code is in the support-service-lambdas repo',
			alarmImpact: 'Search the log link below for "error"',
			lambdaPolicies: [
				new AllowZuoraOAuthSecretsPolicy(this),
				new AllowSqsSendPolicy(
					this,
					`braze-emails`,
					'supporter-product-data',
					'product-switch-salesforce-tracking',
				),
			],
		});
	}
}
