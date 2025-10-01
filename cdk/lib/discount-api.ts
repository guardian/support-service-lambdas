import type { App } from 'aws-cdk-lib';
import type { SrQueueName } from './cdk/policies';
import {
	AllowS3CatalogReadPolicy,
	AllowSqsSendPolicy,
	AllowZuoraOAuthSecretsPolicy,
} from './cdk/policies';
import { SrRestApi } from './cdk/sr-rest-api';
import type { SrStageNames } from './cdk/sr-stack';
import { SrStack } from './cdk/sr-stack';

export class DiscountApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stack: 'support', stage, app: 'discount-api' });

		const restApi = new SrRestApi(this, {
			lambdaDesc:
				'A lambda that enables the addition of discounts to existing subscriptions',
			alarmImpact: 'Search the log link below for "error"',
			gatewayDescription: 'API Gateway created by CDK', // retained to avoid recreating the AWS::ApiGateway::Deployment
		});

		const queuePrefixes: SrQueueName[] = [`braze-emails`];

		restApi.lambda.role?.attachInlinePolicy(new AllowS3CatalogReadPolicy(this));
		restApi.lambda.role?.attachInlinePolicy(
			new AllowZuoraOAuthSecretsPolicy(this),
		);
		restApi.lambda.role?.attachInlinePolicy(
			new AllowSqsSendPolicy(this, queuePrefixes),
		);
	}
}
