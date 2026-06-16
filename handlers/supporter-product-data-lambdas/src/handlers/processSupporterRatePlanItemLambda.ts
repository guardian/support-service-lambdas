import { Lazy } from '@modules/lazy';
import { logger } from '@modules/logger/logger';
import { createSecondarySubscription } from '@modules/multiple-account/secondarySubscription';
import { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { stageFromEnvironment } from '@modules/stage';
import type { Stage } from '@modules/stage';
import { getSupporterRatePlan } from '@modules/supporter-product-data/supporterProductData';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
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

/**
 * Check whether a secondary subscription already exists for the given
 * secondary identity and subscription name, and either update the term
 * end date and TTL or create a new secondary subscription as appropriate.
 * @param stage
 * @param dynamoService
 * @param secondaryIdentityId
 * @param secondarySubscriptionName
 * @param item
 */
const updateOrCreateSecondarySubscription = async (
	stage: Stage,
	dynamoService: DynamoService,
	secondaryIdentityId: string,
	secondarySubscriptionName: string,
	item: SupporterRatePlanItem,
): Promise<void> => {
	const existingRecord = await getSupporterRatePlan(
		stage,
		secondaryIdentityId,
		secondarySubscriptionName,
	);
	if (existingRecord) {
		await dynamoService.updateSecondaryItemDates(
			secondaryIdentityId,
			secondarySubscriptionName,
			item.termEndDate,
		);
	} else {
		logger.log(
			'Secondary subscription record not found in SupporterProductData, creating new record',
			{ secondaryIdentityId, secondarySubscriptionName },
		);
		await createSecondarySubscription(
			stage,
			item,
			secondaryIdentityId,
			dayjs(),
		);
	}
};

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
		writeItem: (item) => dynamoService.writeItem(item),
		getSecondaryUsers: (subscriptionName) =>
			secondaryUserRepository.list(subscriptionName),
		updateOrCreateSecondarySubscription: (
			secondaryIdentityId,
			secondarySubscriptionName,
			item,
		) =>
			updateOrCreateSecondarySubscription(
				stage,
				dynamoService,
				secondaryIdentityId,
				secondarySubscriptionName,
				item,
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
