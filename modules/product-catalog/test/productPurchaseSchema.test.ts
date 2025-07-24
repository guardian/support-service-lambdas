import { productPurchaseSchema } from '@modules/product-catalog/productPurchaseSchema';

test('productPurchaseSchema works', () => {
	expect(
		productPurchaseSchema.safeParse({
			product: 'Contribution',
			ratePlan: 'Monthly',
		}).success,
	).toBe(false); // Contributions need an amount
	expect(
		productPurchaseSchema.safeParse({
			product: 'Contribution',
			ratePlan: 'Monthly',
			amount: 10,
		}).success,
	).toBe(true);
	expect(
		productPurchaseSchema.safeParse({
			product: 'Contribution',
			ratePlan: 'OneYearGift',
		}).success,
	).toBe(false); // There is no OneYearGift rate plan for Contributions
	expect(
		productPurchaseSchema.safeParse({
			product: 'GuardianWeeklyRestOfWorld',
			ratePlan: 'Monthly',
		}).success,
	).toBe(true);
	expect(
		productPurchaseSchema.safeParse({
			product: 'GuardianWeeklyRestOfWorld',
			ratePlan: 'Annual',
		}).success,
	).toBe(true);
	expect(
		productPurchaseSchema.safeParse({
			product: 'GuardianAdLite',
			ratePlan: 'Monthly',
		}).success,
	).toBe(true);
	expect(
		productPurchaseSchema.safeParse({
			product: 'GuardianAdLite',
			ratePlan: 'Annual',
		}).success,
	).toBe(false); // There is no Annual rate plan for GuardianAdLite
});
