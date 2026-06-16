import type { Stage } from '@modules/stage';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import { sendToSupporterProductData } from '@modules/supporter-product-data/supporterProductData';
import type { Dayjs } from 'dayjs';

export const secondarySubscriptionName = (
	primarySubscriptionName: string,
	secondaryIdentityId: string,
): string => `${primarySubscriptionName}-${secondaryIdentityId}`;

export const createSecondarySubscription = async (
	stage: Stage,
	primaryItem: SupporterRatePlanItem,
	secondaryIdentityId: string,
	contractEffectiveDate: Dayjs,
): Promise<string> => {
	const subscriptionName = secondarySubscriptionName(
		primaryItem.subscriptionName,
		secondaryIdentityId,
	);
	const record: SupporterRatePlanItem = {
		subscriptionName,
		primarySubscriptionName: primaryItem.subscriptionName,
		identityId: secondaryIdentityId,
		productRatePlanId: primaryItem.productRatePlanId,
		productRatePlanName: 'Digital Plus Secondary User',
		contractEffectiveDate,
		termEndDate: primaryItem.termEndDate,
	};
	await sendToSupporterProductData(stage, record);
	return subscriptionName;
};
