// TODO use central eligibility checker pattern
import type { ZuoraRatePlan } from '../../guardianSubscription/reprocessRatePlans/zuoraRatePlanBuilder';

export function isEligibleForSwitch(
	subscriptionStatus: string,
	totalInvoiceBalance: number,
	discountRatePlans: ZuoraRatePlan[],
): boolean {
	const hasNonEndedDiscount: boolean = discountRatePlans.length > 0;
	return (
		subscriptionStatus === 'Active' &&
		totalInvoiceBalance === 0 &&
		!hasNonEndedDiscount
	);
}
