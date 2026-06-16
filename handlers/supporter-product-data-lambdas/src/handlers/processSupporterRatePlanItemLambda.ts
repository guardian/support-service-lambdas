import { Lazy } from '@modules/lazy';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import type { Handler, SQSEvent } from 'aws-lambda';
import {
	getDiscountProductRatePlanIds,
	isDiscountProductRatePlanItem,
} from '../services/discounts';
import { DynamoService } from '../services/dynamoService';
import { SecondaryUserService } from '../services/secondaryUserService';
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
	const secondaryUserService = SecondaryUserService.create(stage);

	const zuoraCatalog = await getZuoraCatalogFromS3(stage);
	const productCatalog = await getProductCatalogFromApi(stage);
	const discountIds = getDiscountProductRatePlanIds(zuoraCatalog);

	return {
		isDiscountRatePlanItem: (item) =>
			isDiscountProductRatePlanItem(discountIds, item),
		contributionIds: [
			productCatalog.Contribution.ratePlans.Annual.id,
			productCatalog.Contribution.ratePlans.Monthly.id,
		],
		getSubscription: (subscriptionName) =>
			subscriptionService.getSubscription(subscriptionName),
		writeItem: (item) => dynamoService.writeItem(item),
		getSecondaryUsers: (subscriptionName) =>
			secondaryUserService.listBySubscription(subscriptionName),
		updateSecondarySubscription: (
			secondaryIdentityId,
			secondarySubscriptionName,
			item,
		) =>
			dynamoService.updateSecondaryItemDates(
				secondaryIdentityId,
				secondarySubscriptionName,
				item.termEndDate,
			),
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
