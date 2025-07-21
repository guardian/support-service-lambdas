import { validProductAndRatePlanCombinationsSchema } from '@modules/product-catalog/validProductAndRatePlanCombinations';

test('validProductAndRatePlanCombinationsSchema works', () => {
	expect(
		validProductAndRatePlanCombinationsSchema.safeParse({
			product: 'Contribution',
			ratePlan: 'Monthly',
		}).success,
	).toBe(false);
	expect(
		validProductAndRatePlanCombinationsSchema.safeParse({
			product: 'Contribution',
			ratePlan: 'Monthly',
			amount: 10,
		}).success,
	).toBe(true);
	expect(
		validProductAndRatePlanCombinationsSchema.safeParse({
			product: 'Contribution',
			ratePlan: 'OneYearGift',
		}).success,
	).toBe(false);
	expect(
		validProductAndRatePlanCombinationsSchema.safeParse({
			product: 'GuardianWeeklyRestOfWorld',
			ratePlan: 'Monthly',
		}).success,
	).toBe(true);
	expect(
		validProductAndRatePlanCombinationsSchema.safeParse({
			product: 'GuardianWeeklyRestOfWorld',
			ratePlan: 'Annual',
		}).success,
	).toBe(true);
	expect(
		validProductAndRatePlanCombinationsSchema.safeParse({
			product: 'GuardianAdLite',
			ratePlan: 'Monthly',
		}).success,
	).toBe(true);
	expect(
		validProductAndRatePlanCombinationsSchema.safeParse({
			product: 'GuardianAdLite',
			ratePlan: 'Annual',
		}).success,
	).toBe(false);
});
