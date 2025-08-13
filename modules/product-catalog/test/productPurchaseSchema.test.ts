import { productPurchaseSchema } from '@modules/product-catalog/productPurchaseSchema';

const contact = {
	firstName: 'John',
	lastName: 'Doe',
	workEmail: 'test@test.com',
	country: 'GB',
	city: 'London',
	address1: '123 Test St',
	address2: null,
	postalCode: 'E1 6AN',
};
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
			soldToContact: contact,
		}).success,
	).toBe(false); // First delivery date is required for delivery products
	expect(
		productPurchaseSchema.safeParse({
			product: 'GuardianWeeklyRestOfWorld',
			ratePlan: 'Monthly',
			firstDeliveryDate: new Date('2023-10-01'),
		}).success,
	).toBe(false); // soldToContact is required for delivery products
	expect(
		productPurchaseSchema.safeParse({
			product: 'GuardianWeeklyRestOfWorld',
			ratePlan: 'Annual',
			firstDeliveryDate: new Date('2023-10-01'),
			soldToContact: contact,
		}).success,
	).toBe(true);
	expect(
		productPurchaseSchema.safeParse({
			product: 'NationalDelivery',
			ratePlan: 'EverydayPlus',
			firstDeliveryDate: new Date('2023-10-01'),
			soldToContact: contact,
		}).success,
	).toBe(false); // National Delivery requires a delivery agent
	expect(
		productPurchaseSchema.safeParse({
			product: 'NationalDelivery',
			ratePlan: 'EverydayPlus',
			firstDeliveryDate: new Date('2023-10-01'),
			soldToContact: contact,
			deliveryAgent: 'test-agent',
		}).success,
	).toBe(true);
	expect(
		productPurchaseSchema.safeParse({
			product: 'GuardianAdLite',
			ratePlan: 'Annual',
		}).success,
	).toBe(false); // There is no Annual rate plan for GuardianAdLite
	expect(
		productPurchaseSchema.safeParse({
			product: 'GuardianAdLite',
			ratePlan: 'Monthly',
		}).success,
	).toBe(true);
});
