import type { GuardianRatePlan } from '../src/reprocessRatePlans/guardianRatePlanBuilder.ts';

// @ts-expect-error -- this is to ensure type narrowing isn't broken
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- this is to ensure type narrowing isn't broken
function shouldCompile(ratePlan: GuardianRatePlan) {
	if (
		ratePlan.productKey === 'SupporterPlus' &&
		ratePlan.productRatePlanKey === 'OneYearStudent'
	) {
		const a1: string = ratePlan.product.customerFacingName;
		const a2: number = ratePlan.productRatePlan.pricing.NZD;
		const a3: number | null = ratePlan.ratePlanCharges.Subscription.price;
		// @ts-expect-error -- ensure that we can't see charges on other rate plans
		const a4 = ratePlan.ratePlanCharges.Contribution as unknown;
		return { a1, a2, a3, a4 };
	}

	if (
		ratePlan.productKey === 'SupporterPlus' &&
		(ratePlan.productRatePlanKey === 'Monthly' ||
			ratePlan.productRatePlanKey === 'Annual')
	) {
		const b1: string = ratePlan.product.customerFacingName;
		const b2: number = ratePlan.productRatePlan.pricing.AUD;
		const b3: number | null = ratePlan.ratePlanCharges.Contribution.price;
		return { b1, b2, b3 };
	}
}
