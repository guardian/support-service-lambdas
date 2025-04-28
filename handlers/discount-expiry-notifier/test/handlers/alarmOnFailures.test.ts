import { shouldSendErrorNotification } from '../../src/handlers/alarmOnFailures';
import type { DiscountProcessingAttempt } from '../../src/types';

describe('shouldSendErrorNotification', () => {
	it('returns true when s3UploadAttemptStatus is "error"', async () => {
		const discountProcessingAttempts: DiscountProcessingAttempt[] = [];
		const s3UploadAttemptStatus = 'error';
		const result = await shouldSendErrorNotification(
			discountProcessingAttempts,
			s3UploadAttemptStatus,
		);
		expect(result).toBe(true);
	});

	it('returns true when a discountProcessingAttempt isEligible is false and ineligibilityReason is one of error notification reasons', async () => {
		const discountProcessingAttempts: DiscountProcessingAttempt[] = [
			{
				emailSendAttempt: {
					response: { status: 'skipped' },
				},
				emailSendEligibility: {
					ineligibilityReason: 'Error getting sub status from Zuora',
					isEligible: false,
				},
				record: {
					billingAccountId: '12345',
					firstName: 'John',
					firstPaymentDateAfterDiscountExpiry: '2023-01-01',
					paymentCurrency: 'USD',
					paymentFrequency: 'Monthly',
					productName: 'Supporter Plus',
					sfContactId: '67890',
					zuoraSubName: 'A-S12345678',
					workEmail: 'abc123@guardian.co.uk',
					contactCountry: 'United States',
					sfBuyerContactMailingCountry: 'United States',
					sfBuyerContactOtherCountry: 'United States',
					sfRecipientContactMailingCountry: 'United States',
					sfRecipientContactOtherCountry: 'United States',
					subStatus: 'active',
					errorDetail: undefined,
				},
			},
		];
		const s3UploadAttemptStatus = 'success';
		const result = await shouldSendErrorNotification(
			discountProcessingAttempts,
			s3UploadAttemptStatus,
		);
		expect(result).toBe(true);
	});

	it('returns false when no errors occurred and it was eligible for email send', async () => {
		const discountProcessingAttempts: DiscountProcessingAttempt[] = [
			{
				emailSendAttempt: {
					response: { status: 'success' },
				},
				emailSendEligibility: {
					ineligibilityReason: '',
					isEligible: true,
				},
				record: {
					billingAccountId: '12345',
					firstName: 'John',
					firstPaymentDateAfterDiscountExpiry: '2023-01-01',
					paymentCurrency: 'USD',
					paymentFrequency: 'Monthly',
					productName: 'Supporter Plus',
					sfContactId: '67890',
					zuoraSubName: 'A-S12345678',
					workEmail: 'abc123@guardian.co.uk',
					contactCountry: 'United States',
					sfBuyerContactMailingCountry: 'United States',
					sfBuyerContactOtherCountry: 'United States',
					sfRecipientContactMailingCountry: 'United States',
					sfRecipientContactOtherCountry: 'United States',
					subStatus: 'active',
					errorDetail: undefined,
				},
			},
		];
		const s3UploadAttemptStatus = 'success';
		const result = await shouldSendErrorNotification(
			discountProcessingAttempts,
			s3UploadAttemptStatus,
		);
		expect(result).toBe(false);
	});

	it('returns false when ineligibilityReason is not one of error notification reasons', async () => {
		const discountProcessingAttempts: DiscountProcessingAttempt[] = [
			{
				emailSendAttempt: {
					response: { status: 'success' },
				},
				emailSendEligibility: {
					ineligibilityReason: 'Subscription status is cancelled',
					isEligible: false,
				},
				record: {
					billingAccountId: '12345',
					firstName: 'John',
					firstPaymentDateAfterDiscountExpiry: '2023-01-01',
					paymentCurrency: 'USD',
					paymentFrequency: 'Monthly',
					productName: 'Supporter Plus',
					sfContactId: '67890',
					zuoraSubName: 'A-S12345678',
					workEmail: 'abc123@guardian.co.uk',
					contactCountry: 'United States',
					sfBuyerContactMailingCountry: 'United States',
					sfBuyerContactOtherCountry: 'United States',
					sfRecipientContactMailingCountry: 'United States',
					sfRecipientContactOtherCountry: 'United States',
					subStatus: 'active',
					errorDetail: undefined,
				},
			},
		];
		const s3UploadAttemptStatus = 'success';

		const result = await shouldSendErrorNotification(
			discountProcessingAttempts,
			s3UploadAttemptStatus,
		);

		expect(result).toBe(false);
	});
});
