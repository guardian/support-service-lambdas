import type { App } from 'aws-cdk-lib';
import type { SrQueueName } from './cdk/policies';
import {
	AllowSqsSendPolicy,
	AllowZuoraOAuthSecretsPolicy,
} from './cdk/policies';
import { SrRestApi } from './cdk/sr-rest-api';
import type { SrStageNames } from './cdk/sr-stack';
import { SrStack } from './cdk/sr-stack';

export class UpdateSupporterPlusAmount extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, {
			stack: 'support',
			stage,
			app: 'update-supporter-plus-amount',
		});

		const restApi = new SrRestApi(this, {
			lambdaDesc:
				'An API Gateway triggered lambda to carry out supporter plus amount updates',
			alarmImpact:
				'Update supporter plus amount api returned a 5XX response. This means that a user who was trying to update the ' +
				'contribution amount of their supporter plus subscription has received an error. Search the log link below for "error"',
			gatewayDescription: 'API Gateway created by CDK', // retained to avoid recreating the AWS::ApiGateway::Deployment
		});

		const queuePrefixes: SrQueueName[] = [
			`braze-emails`,
			'supporter-product-data',
		];

		restApi.lambda.role?.attachInlinePolicy(
			new AllowZuoraOAuthSecretsPolicy(this),
		);
		restApi.lambda.role?.attachInlinePolicy(
			new AllowSqsSendPolicy(this, queuePrefixes),
		);
	}
}
