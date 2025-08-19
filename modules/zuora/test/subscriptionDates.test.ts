import dayjs from 'dayjs';
import { getSubscriptionDates } from '@modules/zuora/createSubscription/subscriptionDates';
import { deliveryContact } from './fixtures/createSubscriptionFixtures';
import { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';

describe('getSubscriptionDates', () => {
	const now = dayjs('2024-06-01T12:00:00Z');

	it('should set customerAcceptanceDate to firstDeliveryDate for GuardianWeekly', () => {
		const productPurchase: ProductPurchase = {
			product: 'GuardianWeeklyDomestic',
			ratePlan: 'Monthly',
			firstDeliveryDate: new Date('2024-06-10'),
			deliveryContact: deliveryContact,
		};
		const result = getSubscriptionDates(now, productPurchase);
		expect(result.contractEffectiveDate).toEqual(now);
		expect(result.customerAcceptanceDate.format('YYYY-MM-DD')).toEqual(
			'2024-06-10',
		);
	});

	it('should set customerAcceptanceDate to firstDeliveryDate for TierThree', () => {
		const productPurchase: ProductPurchase = {
			product: 'TierThree',
			ratePlan: 'DomesticAnnualV2',
			firstDeliveryDate: new Date('2024-06-15'),
			deliveryContact: deliveryContact,
		};
		const result = getSubscriptionDates(now, productPurchase);
		expect(result.contractEffectiveDate).toEqual(now);
		expect(result.customerAcceptanceDate.format('YYYY-MM-DD')).toEqual(
			'2024-06-15',
		);
	});

	it('should set customerAcceptanceDate to firstDeliveryDate for HomeDelivery', () => {
		const productPurchase: ProductPurchase = {
			product: 'HomeDelivery',
			ratePlan: 'EverydayPlus',
			firstDeliveryDate: new Date('2024-06-20'),
			deliveryInstructions: 'Leave by front door',
			deliveryContact: deliveryContact,
		};
		const result = getSubscriptionDates(now, productPurchase);
		expect(result.contractEffectiveDate).toEqual(now);
		expect(result.customerAcceptanceDate.format('YYYY-MM-DD')).toEqual(
			'2024-06-20',
		);
	});

	it('should set customerAcceptanceDate to firstDeliveryDate for NationalDelivery', () => {
		const productPurchase: ProductPurchase = {
			product: 'NationalDelivery',
			ratePlan: 'EverydayPlus',
			firstDeliveryDate: new Date('2024-06-20'),
			deliveryInstructions: 'Leave by front door',
			deliveryContact: deliveryContact,
			deliveryAgent: 123,
		};
		const result = getSubscriptionDates(now, productPurchase);
		expect(result.contractEffectiveDate).toEqual(now);
		expect(result.customerAcceptanceDate.format('YYYY-MM-DD')).toEqual(
			'2024-06-20',
		);
	});

	it('should set customerAcceptanceDate to now + 16 days for DigitalSubscription', () => {
		const productPurchase: ProductPurchase = {
			product: 'DigitalSubscription',
			ratePlan: 'Monthly',
		};
		const result = getSubscriptionDates(now, productPurchase);
		expect(result.contractEffectiveDate).toEqual(now);
		expect(result.customerAcceptanceDate).toEqual(now.add(16, 'day'));
	});

	it('should set customerAcceptanceDate to now + 15 days for GuardianAdLite', () => {
		const productPurchase: ProductPurchase = {
			product: 'GuardianAdLite',
			ratePlan: 'Monthly',
		};
		const result = getSubscriptionDates(now, productPurchase);
		expect(result.contractEffectiveDate).toEqual(now);
		expect(result.customerAcceptanceDate).toEqual(now.add(15, 'day'));
	});

	it('should set customerAcceptanceDate to now for other product types', () => {
		const products = ['SupporterPlus', 'Contribution'] as const;
		products.forEach((product) => {
			console.log(`Testing product type: ${product}`);
			const productPurchase: ProductPurchase = {
				product,
				ratePlan: 'Monthly',
				amount: 10,
			};
			const result = getSubscriptionDates(now, productPurchase);
			expect(result.contractEffectiveDate).toEqual(now);
			expect(result.customerAcceptanceDate).toEqual(now);
		});
	});
});
