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
describe('productPurchaseSchema', () => {
	test('it can parse all the product types', () => {
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
			}).error,
		).toBeUndefined();
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
				deliveryContact: contact,
			}).success,
		).toBe(false); // First delivery date is required for delivery products
		expect(
			productPurchaseSchema.safeParse({
				product: 'GuardianWeeklyRestOfWorld',
				ratePlan: 'Monthly',
				firstDeliveryDate: '2023-10-01',
			}).success,
		).toBe(false); // deliveryContact is required for delivery products
		expect(
			productPurchaseSchema.safeParse({
				product: 'GuardianWeeklyRestOfWorld',
				ratePlan: 'Annual',
				firstDeliveryDate: '2023-10-01',
				deliveryContact: contact,
			}).error,
		).toBeUndefined();
		expect(
			productPurchaseSchema.safeParse({
				product: 'HomeDelivery',
				ratePlan: 'EverydayPlus',
				firstDeliveryDate: '2023-10-01',
				deliveryContact: contact,
			}).success,
		).toBe(false); // All newspaper products requires delivery instructions
		expect(
			productPurchaseSchema.safeParse({
				product: 'HomeDelivery',
				ratePlan: 'EverydayPlus',
				firstDeliveryDate: '2023-10-01',
				deliveryContact: contact,
				deliveryInstructions: 'Leave it in the porch',
			}).error,
		).toBeUndefined();
		expect(
			productPurchaseSchema.safeParse({
				product: 'NationalDelivery',
				ratePlan: 'EverydayPlus',
				firstDeliveryDate: '2023-10-01',
				deliveryContact: contact,
				deliveryInstructions: 'Leave it in the porch',
			}).success,
		).toBe(false); // National Delivery requires a delivery agent
		expect(
			productPurchaseSchema.safeParse({
				product: 'NationalDelivery',
				ratePlan: 'EverydayPlus',
				firstDeliveryDate: '2023-10-01',
				deliveryContact: contact,
				deliveryInstructions: 'Leave it in the porch',
				deliveryAgent: 123,
			}).error,
		).toBeUndefined();
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
			}).error,
		).toBeUndefined();
	});
	test('it can handle either string or date for firstDeliveryDate', () => {
		expect(
			productPurchaseSchema.safeParse({
				product: 'HomeDelivery',
				ratePlan: 'EverydayPlus',
				firstDeliveryDate: '2023-10-01',
				deliveryContact: contact,
				deliveryInstructions: 'Leave it in the porch',
			}).error,
		).toBeUndefined();
		expect(
			productPurchaseSchema.safeParse({
				product: 'HomeDelivery',
				ratePlan: 'EverydayPlus',
				firstDeliveryDate: new Date('2023-10-01'),
				deliveryContact: contact,
				deliveryInstructions: 'Leave it in the porch',
			}).error,
		).toBeUndefined();
	});
});
