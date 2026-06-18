import { Lazy } from '@modules/lazy';
import { createSecondarySubscription } from '@modules/multiple-account/secondarySubscription';
import { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import type { Handler, SQSEvent } from 'aws-lambda';
import dayjs from 'dayjs';
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
	const secondaryUserRepository = SecondaryUserRepository.create(stage);

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
		writePrimaryItem: (item) => dynamoService.writeItem(item),
		getSecondaryUsers: (subscriptionName) =>
			secondaryUserRepository.list(subscriptionName),
		writeSecondaryItem: async (secondaryIdentityId, item) => {
			// Create is an upsert, so if the secondary subscription already exists it will be updated
			await createSecondarySubscription(
				stage,
				item,
				secondaryIdentityId,
				dayjs(),
			);
		},
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
