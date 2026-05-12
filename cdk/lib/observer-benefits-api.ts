import { GuApiGatewayWithLambdaByPath } from '@guardian/cdk';
import type { App } from 'aws-cdk-lib';
import { UsagePlan } from 'aws-cdk-lib/aws-apigateway';
import { allowedOriginsForStage } from '../../handlers/observer-benefits-api/src/cors';
import {
	AllowS3CatalogReadPolicy,
	AllowZuoraOAuthSecretsPolicy,
} from './cdk/policies';
import { SrApiLambda } from './cdk/SrApiLambda';
import { SrLambda } from './cdk/SrLambda';
import { SrRestDomain } from './cdk/SrRestDomain';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class ObserverBenefitsApi extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'observer-benefits-api' });

		const app = 'observer-api';

		const lambda = new SrApiLambda(this, 'Lambda', {
			lambdaOverrides: {
				description: 'Handles API requests for observer benefits',
			},
			monitoring: {
				errorImpact:
					'An eligible user may not be getting Observer digital benefits',
			},
			throttle: {
				rateLimit: 20,
				burstLimit: 10,
			},
		});

		lambda.addPolicies(
			new AllowZuoraOAuthSecretsPolicy(this),
			new AllowS3CatalogReadPolicy(this),
		);

		const observerApiDocumentionLambda = new SrLambda(
			this,
			'DocumentationLambda',
			{
				legacyId: 'observer-api-documentation-lambda',
				nameSuffix: 'documentation',
				lambdaOverrides: {
					description:
						'An API Gateway triggered lambda to return the swagger documentation page for the observer API',
					handler: 'index.observerApiDocumentationHandler',
				},
			},
		);

		const apiGateway = new GuApiGatewayWithLambdaByPath(this, {
			app,
			targets: [
				{
					// Auth is handled by the lambda which validates a JWT
					path: '/documentation',
					httpMethod: 'GET',
					lambda: observerApiDocumentionLambda,
				},
			],
			defaultCorsPreflightOptions: {
				allowHeaders: ['*'],
				allowMethods: ['GET'],
				allowOrigins: allowedOriginsForStage(this.stage),
			},
			monitoringConfiguration: {
				http5xxAlarm: { tolerated5xxPercentage: 5 },
				snsTopicName: `alarms-handler-topic-${this.stage}`,
			},
		});

		// ---- API Key ---- //
		const usagePlan = new UsagePlan(this, 'UserBenefitsUsagePlan', {
			name: `user-benefits-api-usage-plan-${this.stage}`,
			apiStages: [
				{
					api: apiGateway.api,
					stage: apiGateway.api.deploymentStage,
				},
			],
		});
		const apiKey = apiGateway.api.addApiKey(`${app}-api-key-${this.stage}`, {
			apiKeyName: `${app}-api-key-${this.stage}`,
		});
		usagePlan.addApiKey(apiKey);

		new SrRestDomain(this, apiGateway.api, {
			publicDomain: true,
			domainIdOverride: 'NS1 DNS entry',
		});
	}
}
