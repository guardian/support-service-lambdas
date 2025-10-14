import { GuApiGatewayWithLambdaByPath } from '@guardian/cdk';
import type { App } from 'aws-cdk-lib';
import { Duration, Fn } from 'aws-cdk-lib';
import { UsagePlan } from 'aws-cdk-lib/aws-apigateway';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { allowedOriginsForStage } from '../../handlers/user-benefits/src/cors';
import { SrLambda } from './cdk/sr-lambda';
import { SrRestDomain } from './cdk/sr-rest-domain';
import type { SrStageNames } from './cdk/sr-stack';
import { SrStack } from './cdk/sr-stack';

export class UserBenefits extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { app: 'user-benefits', stage });

		const app = this.app;

		const supporterProductDataTablePolicy = new PolicyStatement({
			actions: ['dynamodb:Query'],
			resources: [
				Fn.importValue(
					`supporter-product-data-tables-${this.stage}-SupporterProductDataTable`,
				),
			],
		});

		const commonLambdaProps = {
			initialPolicy: [supporterProductDataTablePolicy],
			timeout: Duration.seconds(300),
		};
		const userBenefitsMeLambda = new SrLambda(this, `user-benefits-me-lambda`, {
			nameSuffix: 'me',
			lambdaOverrides: {
				description:
					'An API Gateway triggered lambda to get the benefits of a user identified by a JWT',
				handler: 'index.benefitsMeHandler',
				...commonLambdaProps,
			},
		});
		const userBenefitsIdentityIdLambda = new SrLambda(
			this,
			`user-benefits-identity-id-lambda`,
			{
				nameSuffix: 'identity-id',
				lambdaOverrides: {
					description:
						'An API Gateway triggered lambda to get the benefits of the user identified in the request path',
					handler: 'index.benefitsIdentityIdHandler',
					...commonLambdaProps,
				},
			},
		);
		const userBenefitsListLambda = new SrLambda(
			this,
			`user-benefits-list-lambda`,
			{
				nameSuffix: 'list',
				lambdaOverrides: {
					description:
						'An API Gateway triggered lambda to return the full list of benefits for each product in html or json format',
					handler: 'index.benefitsListHandler',
					...commonLambdaProps,
				},
			},
		);
		const apiGateway = new GuApiGatewayWithLambdaByPath(this, {
			app,
			targets: [
				{
					// Auth is handled by the lambda which validates a JWT
					path: '/benefits/me',
					httpMethod: 'GET',
					lambda: userBenefitsMeLambda,
				},
				{
					path: '/benefits/{identityId+}',
					httpMethod: 'GET',
					lambda: userBenefitsIdentityIdLambda,
					apiKeyRequired: true,
				},
				{
					path: '/benefits/list',
					httpMethod: 'GET',
					lambda: userBenefitsListLambda,
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
