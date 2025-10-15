import { Lazy } from '@modules/lazy';
import { getIfDefined } from '@modules/nullAndUndefined';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { stageFromEnvironment } from '@modules/stage';
import type { DynamoDBRecord, Handler } from 'aws-lambda';
import type { Config } from './config';
import { getConfig } from './config';
import { fetchSubscriptionDetails } from './mobileProductPurchasesApi';

type InputEvent = {
	detail: DynamoDBRecord;
};

export const lazyConfig = new Lazy(
	async () => getConfig(),
	'load config from SSM',
);

export const handler: Handler = async (event: InputEvent) => {
	console.log(`Input is ${JSON.stringify(event, null, 2)}`);
	const stage = stageFromEnvironment();
	if (event.detail.eventName === 'REMOVE') {
		logger.log('Skipping REMOVE event');
		return;
	}
	await updateSupporterProductData(stage, await lazyConfig.get(), event);
};

const updateSupporterProductData = async (
	stage: Stage,
	config: Config,
	event: InputEvent,
) => {
	logger.log(
		'info',
		`Updated supporter product data for stage ${stage} with event ${JSON.stringify(event)}`,
	);
	const identityId = getIfDefined(
		event.detail.dynamodb?.NewImage?.userId?.S,
		'Identity ID was not present in the event',
	);
	const subscription = await fetchSubscriptionDetails(
		config.mobilePurchasesApiKey,
		identityId,
	);
	console.log('Fetched subscription', subscription);
	return Promise.resolve();
};
