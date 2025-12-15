import dayjs from 'dayjs';
import { buildFrequencySwitchEmailMessage } from '../src/frequencySwitchEmail';

describe('buildFrequencySwitchEmailMessage', () => {
	it('should build correct email message for frequency switch', () => {
		const emailAddress = 'test.user@example.com';
		const firstName = 'Test';
		const lastName = 'User';
		const identityId = '123456789';
		const subscriptionNumber = 'A-S00123456';
		const currency = 'GBP';
		const newAnnualPrice = 95.0;
		const nextPaymentDate = dayjs('2026-01-15');

		const result = buildFrequencySwitchEmailMessage(
			emailAddress,
			firstName,
			lastName,
			identityId,
			subscriptionNumber,
			currency,
			newAnnualPrice,
			nextPaymentDate,
		);

		expect(result).toEqual({
			To: {
				Address: 'test.user@example.com',
				ContactAttributes: {
					SubscriberAttributes: {
						first_name: 'Test',
						last_name: 'User',
						currency: '£',
						new_price: '95.00',
						next_payment_date: '15 January 2026',
						payment_frequency: 'Annually',
						subscription_id: 'A-S00123456',
					},
				},
			},
			DataExtensionName: 'supporter-plus-frequency-switch-confirmation',
			IdentityUserId: '123456789',
		});
	});

	it('should format USD currency correctly', () => {
		const result = buildFrequencySwitchEmailMessage(
			'test@example.com',
			'John',
			'Doe',
			'987654321',
			'A-S00999999',
			'USD',
			120.0,
			dayjs('2026-02-01'),
		);

		expect(result.To.ContactAttributes.SubscriberAttributes.currency).toBe(
			'US$',
		);
		expect(result.To.ContactAttributes.SubscriberAttributes.new_price).toBe(
			'120.00',
		);
		expect(
			result.To.ContactAttributes.SubscriberAttributes.next_payment_date,
		).toBe('01 February 2026');
	});

	it('should format EUR currency correctly', () => {
		const result = buildFrequencySwitchEmailMessage(
			'test@example.com',
			'Jane',
			'Smith',
			'555555555',
			'A-S00777777',
			'EUR',
			100.0,
			dayjs('2026-03-15'),
		);

		expect(result.To.ContactAttributes.SubscriberAttributes.currency).toBe('€');
	});
});
