import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import { sendToSupporterProductData } from '@modules/supporter-product-data/supporterProductData';
import type { SubscriptionDetails } from './types';

/**
 * Syncs subscription data to SupporterProductData DynamoDB table via SQS.
 *
 * This sends one message per rate plan in the subscription to the
 * supporter-product-data-{stage} SQS queue. The queue is consumed by
 * a Lambda in support-frontend that writes to the DynamoDB table.
 *
 * @see https://github.com/guardian/support-frontend/blob/main/supporter-product-data/src/main/scala/com/gu/lambdas/ProcessSupporterRatePlanItemLambda.scala
 */
export const syncSubscriptionToSupporterProductData = async (
	stage: Stage,
	identityId: string,
	subscription: SubscriptionDetails,
): Promise<number> => {
	const { subscriptionNumber, termEndDate, contractEffectiveDate, ratePlans } =
		subscription;

	if (ratePlans.length === 0) {
		logger.log(
			`No active rate plans found for subscription ${subscriptionNumber}, skipping SupporterProductData sync`,
		);
		return 0;
	}

	logger.log(
		`Syncing ${ratePlans.length} rate plan(s) to SupporterProductData for subscription ${subscriptionNumber}`,
	);

	let syncedCount = 0;

	for (const ratePlan of ratePlans) {
		const supporterRatePlanItem: SupporterRatePlanItem = {
			subscriptionName: subscriptionNumber,
			identityId: identityId,
			productRatePlanId: ratePlan.productRatePlanId,
			productRatePlanName: ratePlan.productRatePlanName,
			termEndDate: termEndDate,
			contractEffectiveDate: contractEffectiveDate,
		};

		try {
			await sendToSupporterProductData(stage, supporterRatePlanItem);
			syncedCount++;
			logger.log(
				`Synced rate plan ${ratePlan.productRatePlanName} for subscription ${subscriptionNumber}`,
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			logger.log(
				`Failed to sync rate plan ${ratePlan.productRatePlanName}: ${errorMessage}`,
			);
			throw error;
		}
	}

	logger.log(
		`Successfully synced ${syncedCount} rate plan(s) for subscription ${subscriptionNumber}`,
	);

	return syncedCount;
};
