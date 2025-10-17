import type { App } from 'aws-cdk-lib';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { AllowSupporterProductDataPutItemPolicy } from './cdk/policies';
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
		lambda.addPolicies(new AllowSupporterProductDataPutItemPolicy(this));

		const mobilePurchasesBus = EventBus.fromEventBusName(
			this,
			'MobilePurchasesBus',
			`mobile-purchases-dynamo-stream-${this.stage}`,
		);

		const forwardMobilePurchasesRule = new Rule(
			this,
			'ForwardMobilePurchasesToSupporterProductData',
			{
				ruleName: `forward-mobile-purchases-to-lambda-${this.stage}`,
				description:
					'Forward DynamoDB stream purchase events to mobile-purchases-to-supporter-product-data-lambda',
				eventBus: mobilePurchasesBus,
				eventPattern: {
					detail: {
						eventSource: ['aws:dynamodb'],
					},
				},
			},
		);

		forwardMobilePurchasesRule.addTarget(new LambdaFunction(lambda));
	}
}
