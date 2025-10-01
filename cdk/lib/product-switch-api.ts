import type { App } from 'aws-cdk-lib';
import { getSqsPolicy, zuoraOAuthSecretsPolicy } from './cdk/policies';
import { SrRestApi } from './cdk/sr-rest-api';
import type { SrStageNames } from './cdk/sr-stack';
import { SrStack } from './cdk/sr-stack';

export class ProductSwitchApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stack: 'support', stage, app: 'product-switch-api' });

		const restApi = new SrRestApi(this, {
			lambdaDesc:
				'An API Gateway triggered lambda for carrying out product switches. Code is in the support-service-lambdas repo',
			alarmImpact: 'Search the log link below for "error"',
		});

		const queuePrefixes = [
			`braze-emails`,
			'supporter-product-data',
			'product-switch-salesforce-tracking',
		];

		restApi.lambda.role?.attachInlinePolicy(zuoraOAuthSecretsPolicy(this));
		restApi.lambda.role?.attachInlinePolicy(getSqsPolicy(this, queuePrefixes));
	}
}
