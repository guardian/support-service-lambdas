import type { IndexedZuoraRatePlanWithCharges } from '../../guardianSubscription/group/groupSubscriptionByZuoraCatalogIds';

// TODO use central eligibility checker pattern
export function isEligibleForSwitch(
	subscriptionStatus: string,
	totalInvoiceBalance: number,
	discountRatePlans: IndexedZuoraRatePlanWithCharges[],
): boolean {
	const hasNonEndedDiscount: boolean = discountRatePlans.length > 0;
	return (
		subscriptionStatus === 'Active' &&
		totalInvoiceBalance === 0 &&
		!hasNonEndedDiscount
	);
}
