import type { App } from 'aws-cdk-lib';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { SrLambda } from './cdk/SrLambda';
import { SrStack, type SrStageNames } from './cdk/SrStack';

export class MobilePurchasesToSupporterProductData extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'mobile-purchases-to-supporter-product-data' });

		const lambda = new SrLambda(
			this,
			'mobile-purchases-to-supporter-product-data-lambda',
			{
				lambdaOverrides: {
					description:
						'A lambda that writes mobile purchase products into the supporter product data table',
				},
			},
		);

		const mobilePurchasesBus = EventBus.fromEventBusName(
			this,
			'MobilePurchasesBus',
			`mobile-purchases-dynamo-stream-${this.stage}`,
		);

		const forwardMobilePurchasesRule = new Rule(
			this,
			'ForwardMobilePurchasesToSupporterProductData',
			{
				description:
					'Forward DynamoDB stream purchase events to supporter product data lambda',
				eventBus: mobilePurchasesBus,
				eventPattern: {
					detail: {
						eventSource: ['aws.dynamodb'],
					},
				},
			},
		);

		forwardMobilePurchasesRule.addTarget(new LambdaFunction(lambda));
		// lambda.addPolicies(
		// 	new AllowS3CatalogReadPolicy(this),
		// 	new AllowZuoraOAuthSecretsPolicy(this),
		// 	new AllowSqsSendPolicy(this, `braze-emails`),
		// );
	}
}
