import { objectValues } from '@modules/objectFunctions';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { IndexedZuoraRatePlanWithCharges } from '../../guardianSubscription/group/groupSubscriptionByZuoraCatalogIds';

// TODO use central eligibility checker pattern
export function isEligibleForSwitch(
	subscriptionStatus: string,
	totalInvoiceBalance: number,
	discountRatePlan: IndexedZuoraRatePlanWithCharges | undefined,
	today: Dayjs,
): boolean {
	const hasDiscountToday: boolean =
		discountRatePlan === undefined
			? false
			: objectValues(discountRatePlan.ratePlanCharges).find((charge) =>
					dayjs(charge.effectiveEndDate).isAfter(today),
				) !== undefined;
	return (
		subscriptionStatus === 'Active' &&
		totalInvoiceBalance === 0 &&
		!hasDiscountToday
	);
}
