import type { GuardianRatePlan } from '../../../src/guardianSubscription/guardianSubscriptionParser';

// @ts-expect-error -- this is to ensure type narrowing isn't broken
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- this is to ensure type narrowing isn't broken
function shouldCompile(ratePlan: GuardianRatePlan) {
	if (
		ratePlan.productKey === 'SupporterPlus' &&
		ratePlan.productRatePlanKey === 'OneYearStudent'
	) {
		const a = ratePlan.product.customerFacingName;
		const b = ratePlan.productRatePlan.pricing.NZD;
		const c = ratePlan.ratePlanCharges.Subscription.price;
		return { a, b, c };
	}

	if (
		ratePlan.productKey === 'SupporterPlus' &&
		(ratePlan.productRatePlanKey === 'Monthly' ||
			ratePlan.productRatePlanKey === 'Annual')
	) {
		const d = ratePlan.product.customerFacingName;
		const e = ratePlan.productRatePlan.pricing.AUD;
		const f = ratePlan.ratePlanCharges.Contribution.price;
		return { d, e, f };
	}
}
