import dayjs from 'dayjs';
import { getSubscriptionDates } from '@modules/zuora/createSubscription/subscriptionDates';
import { ProductSpecificFields } from '@modules/zuora/createSubscription/productSpecificFields';
import { contact } from './fixtures/createSubscriptionFixtures';

describe('getSubscriptionDates', () => {
	const now = dayjs('2024-06-01T12:00:00Z');

	it('should set customerAcceptanceDate to firstDeliveryDate for GuardianWeekly', () => {
		const productSpecificFields: ProductSpecificFields = {
			product: 'GuardianWeeklyDomestic',
			ratePlan: 'Monthly',
			firstDeliveryDate: '2024-06-10',
			soldToContact: contact,
		};
		const result = getSubscriptionDates(now, productSpecificFields);
		expect(result.contractEffectiveDate).toEqual(now);
		expect(result.customerAcceptanceDate.format('YYYY-MM-DD')).toEqual(
			'2024-06-10',
		);
	});

	it('should set customerAcceptanceDate to firstDeliveryDate for TierThree', () => {
		const productSpecificFields: ProductSpecificFields = {
			product: 'TierThree',
			ratePlan: 'DomesticAnnualV2',
			firstDeliveryDate: '2024-06-15',
			soldToContact: contact,
		};
		const result = getSubscriptionDates(now, productSpecificFields);
		expect(result.contractEffectiveDate).toEqual(now);
		expect(result.customerAcceptanceDate.format('YYYY-MM-DD')).toEqual(
			'2024-06-15',
		);
	});

	it('should set customerAcceptanceDate to firstDeliveryDate for HomeDelivery', () => {
		const productSpecificFields: ProductSpecificFields = {
			product: 'HomeDelivery',
			ratePlan: 'EverydayPlus',
			firstDeliveryDate: '2024-06-20',
			soldToContact: contact,
		};
		const result = getSubscriptionDates(now, productSpecificFields);
		expect(result.contractEffectiveDate).toEqual(now);
		expect(result.customerAcceptanceDate.format('YYYY-MM-DD')).toEqual(
			'2024-06-20',
		);
	});

	it('should set customerAcceptanceDate to firstDeliveryDate for NationalDelivery', () => {
		const productSpecificFields: ProductSpecificFields = {
			product: 'NationalDelivery',
			ratePlan: 'EverydayPlus',
			firstDeliveryDate: '2024-06-20',
			soldToContact: contact,
			deliveryAgent: 'Test Agent',
		};
		const result = getSubscriptionDates(now, productSpecificFields);
		expect(result.contractEffectiveDate).toEqual(now);
		expect(result.customerAcceptanceDate.format('YYYY-MM-DD')).toEqual(
			'2024-06-20',
		);
	});

	it('should set customerAcceptanceDate to now + 16 days for DigitalSubscription', () => {
		const productSpecificFields: ProductSpecificFields = {
			product: 'DigitalSubscription',
			ratePlan: 'Monthly',
		};
		const result = getSubscriptionDates(now, productSpecificFields);
		expect(result.contractEffectiveDate).toEqual(now);
		expect(result.customerAcceptanceDate).toEqual(now.add(16, 'day'));
	});

	it('should set customerAcceptanceDate to now + 15 days for GuardianAdLite', () => {
		const productSpecificFields: ProductSpecificFields = {
			product: 'GuardianAdLite',
			ratePlan: 'Monthly',
		};
		const result = getSubscriptionDates(now, productSpecificFields);
		expect(result.contractEffectiveDate).toEqual(now);
		expect(result.customerAcceptanceDate).toEqual(now.add(15, 'day'));
	});

	it('should set customerAcceptanceDate to now for other product types', () => {
		const products = ['SupporterPlus', 'Contribution'] as const;
		products.forEach((product) => {
			console.log(`Testing product type: ${product}`);
			const productSpecificFields: ProductSpecificFields = {
				product,
				ratePlan: 'Monthly',
				amount: 10,
			};
			const result = getSubscriptionDates(now, productSpecificFields);
			expect(result.contractEffectiveDate).toEqual(now);
			expect(result.customerAcceptanceDate).toEqual(now);
		});
	});
});
