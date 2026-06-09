import { Lazy } from '@modules/lazy';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import type { Handler, SQSEvent } from 'aws-lambda';
import { contributionIdsForStage } from '../services/contributions';
import {
	getDiscountProductRatePlanIds,
	isDiscountProductRatePlanItem,
} from '../services/discounts';
import { DynamoService } from '../services/dynamoService';
import { ZuoraSubscriptionService } from '../services/zuoraSubscriptionService';
import {
	processEvent,
	type ProcessItemDependencies,
} from './processSupporterRatePlanItem';

const buildDependencies = async (): Promise<ProcessItemDependencies> => {
	const stage = stageFromEnvironment();

	const zuoraClient = await ZuoraClient.create(stage);
	const subscriptionService = new ZuoraSubscriptionService(zuoraClient);
	const dynamoService = new DynamoService(stage);

	const zuoraCatalog = await getZuoraCatalogFromS3(stage);
	const discountIds = getDiscountProductRatePlanIds(zuoraCatalog);

	return {
		isDiscountRatePlanItem: (item) =>
			isDiscountProductRatePlanItem(discountIds, item),
		contributionIds: contributionIdsForStage(stage),
		getSubscription: (subscriptionName) =>
			subscriptionService.getSubscription(subscriptionName),
		writeItem: (item) => dynamoService.writeItem(item),
	};
};

const lazyDependencies = new Lazy<ProcessItemDependencies>(
	buildDependencies,
	'Building dependencies',
);

export const handler: Handler<SQSEvent, void> = async (event) => {
	const dependencies = await lazyDependencies.get();
	return processEvent(event.Records, dependencies);
};
