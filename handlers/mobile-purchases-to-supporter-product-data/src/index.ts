import { Lazy } from '@modules/lazy';
import { getIfDefined } from '@modules/nullAndUndefined';
import { prettyPrint } from '@modules/prettyPrint';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { stageFromEnvironment } from '@modules/stage';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import { putSupporterProductData } from '@modules/supporter-product-data/supporterProductData';
import type { DynamoDBRecord, Handler, SQSEvent } from 'aws-lambda';
import dayjs from 'dayjs';
import type { Config } from './config';
import { getConfig } from './config';
import { fetchSubscription } from './mobileProductPurchasesApi';

export type InputEvent = {
	detail: Pick<DynamoDBRecord, 'dynamodb' | 'eventName'>;
};

export const lazyConfig = new Lazy(
	async () => getConfig(),
	'load config from SSM',
);

export const handler: Handler = async (event: SQSEvent) => {
	logger.log(`Input is ${JSON.stringify(event, null, 2)}`);
	const stage = stageFromEnvironment();
	const config = await lazyConfig.get();
	await Promise.all(
		event.Records.map(
			async (record) =>
				await fetchSubscriptionAndDoUpdate(
					stage,
					config,
					JSON.parse(record.body) as InputEvent,
				),
		),
	);
};

export const fetchSubscriptionAndDoUpdate = async (
	stage: Stage,
	config: Config,
	event: InputEvent,
) => {
	if (event.detail.eventName === 'REMOVE') {
		logger.log('Skipping REMOVE event');
		return;
	}
	const identityId = getIfDefined(
		event.detail.dynamodb?.NewImage?.userId?.S,
		'Identity ID was not present in the event',
	);
	const subscriptionId = getIfDefined(
		event.detail.dynamodb?.NewImage?.subscriptionId?.S,
		'Subscription ID was not present in the event',
	);
	logger.log(`Fetching subscription for identityId ${identityId}`);
	const subscription = await fetchSubscription(
		stage,
		config.mobilePurchasesApiKey,
		identityId,
		subscriptionId,
	);
	if (subscription === undefined) {
		// There are a large number of records user subscriptions table that do not have a corresponding subscription.
		// Until we work out exactly why and fix it, we will just log and return.
		logger.log(
			`Subscription with ID ${subscriptionId} not found for user ${identityId}`,
		);
		return;
	}
	logger.log('Fetched subscription', subscription);
	if (subscription.to.isBefore(dayjs())) {
		logger.log(
			'info',
			`Subscription ${subscription.subscriptionId} for identityId ${identityId} is expired, skipping`,
		);
		return;
	}
	const supporterProductDataItem: SupporterRatePlanItem = {
		identityId: identityId,
		subscriptionName: subscription.subscriptionId,
		productRatePlanId: 'in_app_purchase',
		productRatePlanName: subscription.productId,
		termEndDate: subscription.to.toISOString(),
		contractEffectiveDate: subscription.from.toISOString(),
	};
	await putSupporterProductData(stage, [supporterProductDataItem]);
	logger.log(
		'info',
		`Successfully updated supporter product data with item ${prettyPrint(supporterProductDataItem)}`,
	);
};
