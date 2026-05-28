import { putMetric } from '@modules/aws/cloudwatch';
import { Lazy } from '@modules/lazy';
import { logger } from '@modules/logger/logger';
import { type Stage, stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { Handler, SQSEvent } from 'aws-lambda';
import type {
	ContributionAmount,
	SupporterRatePlanItem,
} from '../model/supporterRatePlanItem';
import { supporterRatePlanItemSchema } from '../model/supporterRatePlanItem';
import { ConfigService } from '../services/configService';
import { DynamoService } from '../services/dynamoService';
import {
	type MinimalZuoraSubscription,
	ZuoraSubscriptionService,
} from '../services/zuoraSubscriptionService';

const contributionIdsForStage = (stage: Stage): string[] =>
	stage === 'PROD'
		? ['2c92a0fc5aacfadd015ad24db4ff5e97', '2c92a0fc5e1dc084015e37f58c200eea']
		: ['2c92c0f85a6b134e015a7fcd9f0c7855', '2c92c0f85e2d19af015e3896e824092c'];

const contributionAmountFromZuoraSubscription = (
	subscription: MinimalZuoraSubscription,
	contributionIds: string[],
): ContributionAmount | undefined => {
	const contributionRatePlan = subscription.ratePlans.find((ratePlan) =>
		contributionIds.includes(ratePlan.id),
	);
	const firstCharge = contributionRatePlan?.ratePlanCharges[0];
	if (firstCharge?.price === undefined) {
		return undefined;
	}

	return {
		amount: firstCharge.price,
		currency: firstCharge.currency,
	};
};

type ProcessItemDependencies = {
	discountIds: string[];
	contributionIds: string[];
	getSubscription: (
		subscriptionName: string,
	) => Promise<MinimalZuoraSubscription>;
	writeItem: (item: SupporterRatePlanItem) => Promise<void>;
	triggerDynamoWriteAlarm: () => Promise<void>;
};

const buildDependencies = async (): Promise<ProcessItemDependencies> => {
	const stage = stageFromEnvironment();
	const configService = new ConfigService(stage);
	const config = await configService.loadZuoraConfig();

	const zuoraClient = await ZuoraClient.create(stage);
	const subscriptionService = new ZuoraSubscriptionService(zuoraClient);
	const dynamoService = new DynamoService(stage);

	return {
		discountIds: config.discountProductRatePlanIds,
		contributionIds: contributionIdsForStage(stage),
		getSubscription: (subscriptionName) =>
			subscriptionService.getSubscription(subscriptionName),
		writeItem: (item) => dynamoService.writeItem(item),
		triggerDynamoWriteAlarm: () =>
			putMetric(
				'DynamoWriteFailure',
				stage,
				[{ Name: 'Stage', Value: stage }],
				'supporter-product-data',
			),
	};
};

const lazyDependencies = new Lazy<ProcessItemDependencies>(
	buildDependencies,
	'Building dependencies',
);

const addContributionAmountIfNeeded = async (
	item: SupporterRatePlanItem,
	dependencies: Pick<
		ProcessItemDependencies,
		'contributionIds' | 'getSubscription'
	>,
): Promise<SupporterRatePlanItem> => {
	if (!dependencies.contributionIds.includes(item.productRatePlanId)) {
		return item;
	}

	const subscription = await dependencies.getSubscription(
		item.subscriptionName,
	);
	const contributionAmount = contributionAmountFromZuoraSubscription(
		subscription,
		dependencies.contributionIds,
	);

	return {
		...item,
		contributionAmount,
	};
};

export const processItem = async (
	item: SupporterRatePlanItem,
	dependencies: ProcessItemDependencies,
): Promise<void> => {
	logger.log('Processing supporter rate plan item', {
		subscriptionName: item.subscriptionName,
		identityId: item.identityId,
		productRatePlanId: item.productRatePlanId,
		productRatePlanName: item.productRatePlanName,
		termEndDate: item.termEndDate,
	});

	if (dependencies.discountIds.includes(item.productRatePlanId)) {
		logger.log('Supporter rate plan item is a discount and will be skipped', {
			subscriptionName: item.subscriptionName,
			productRatePlanId: item.productRatePlanId,
		});
		return;
	}

	try {
		const itemWithContribution = await addContributionAmountIfNeeded(
			item,
			dependencies,
		);

		if (itemWithContribution.contributionAmount) {
			logger.log('Resolved contribution amount', {
				subscriptionName: item.subscriptionName,
				amount: itemWithContribution.contributionAmount.amount,
				currency: itemWithContribution.contributionAmount.currency,
			});
		}

		logger.log('Writing item to DynamoDB', {
			subscriptionName: item.subscriptionName,
			identityId: item.identityId,
		});

		await dependencies.writeItem(itemWithContribution);

		logger.log('Successfully wrote item to DynamoDB', {
			subscriptionName: item.subscriptionName,
			identityId: item.identityId,
		});
	} catch (error) {
		logger.error('Error writing item to Dynamo', {
			subscriptionName: item.subscriptionName,
			identityId: item.identityId,
			error,
		});
		await dependencies.triggerDynamoWriteAlarm();
	}
};

const parseItem = (body: string): SupporterRatePlanItem => {
	try {
		return supporterRatePlanItemSchema.parse(JSON.parse(body));
	} catch {
		throw new Error(
			`Couldn't decode a SupporterRatePlanItem with body: ${body}`,
		);
	}
};

export const processEvent = async (
	event: SQSEvent,
	dependencies: ProcessItemDependencies,
): Promise<void> => {
	logger.log('Processing SQS event', { recordCount: event.Records.length });

	await Promise.all(
		event.Records.map(async (record) => {
			const item = parseItem(record.body);
			await processItem(item, dependencies);
		}),
	);

	logger.log('Finished processing SQS event', {
		recordCount: event.Records.length,
	});
};

export const handler: Handler<SQSEvent, void> = async (event) =>
	processEvent(event, await lazyDependencies.get());
