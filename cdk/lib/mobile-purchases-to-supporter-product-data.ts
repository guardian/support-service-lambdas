import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { SqsQueue } from 'aws-cdk-lib/aws-events-targets';
import { AllowSupporterProductDataPutItemPolicy } from './cdk/policies';
import { SrSqsLambda } from './cdk/SrSqsLambda';
import { SrStack, type SrStageNames } from './cdk/SrStack';

export class MobilePurchasesToSupporterProductData extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { stage, app: 'mobile-purchases-to-supporter-product-data' });

		const errorImpact =
			'Supporter Product Data table is not being updated with mobile purchase data, which could result in users not receiving the correct benefits associated with their in app purchase.';
		const lambda = new SrSqsLambda(this, 'Lambda', {
			monitoring: { errorImpact },
			lambdaOverrides: {
				description:
					'A lambda that writes mobile purchase products into the supporter product data table',
				timeout: Duration.minutes(5),
			},
			maxReceiveCount: 3,
			// This must be >= the lambda timeout
			visibilityTimeout: Duration.minutes(5),
		});
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
				ruleName: `forward-mobile-purchases-to-sqs-${this.stage}`,
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

		forwardMobilePurchasesRule.addTarget(new SqsQueue(lambda.inputQueue));
	}
}
