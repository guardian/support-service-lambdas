import dayjs from 'dayjs';
import { buildSupporterPlusEmailFields } from '@modules/email/dataFields/dayZero/supporterPlusEmailFields';
import type { EmailPaymentMethod } from '@modules/email/dataFields/dayZero/types';
import { DataExtensionNames } from '@modules/email/email';
import {
	creditCardPaymentMethod,
	directDebitPaymentMethod,
	emailAddress,
	emailUser,
	fixedTermPaymentSchedule,
	mandateId,
	paymentSchedule,
	subscriptionNumber,
	today,
} from '../fixtures/emailFieldsTestData';

describe('Supporter plus thank you email fields', () => {
	it('should build correct email fields for monthly supporter plus with DD', () => {
		const emailFields = buildSupporterPlusEmailFields({
			today: dayjs(today),
			user: emailUser,
			currency: 'GBP',
			billingPeriod: 'Monthly',
			subscriptionNumber: subscriptionNumber,
			paymentSchedule: paymentSchedule,
			paymentMethod: directDebitPaymentMethod,
			isFixedTerm: false,
			mandateId: mandateId,
			taxMode: 'TaxInclusive',
		});

		const expected = {
			To: {
				Address: emailAddress,
				ContactAttributes: {
					SubscriberAttributes: {
						first_name: emailUser.firstName,
						account_name: (
							directDebitPaymentMethod as Extract<
								EmailPaymentMethod,
								{ Type: 'BankTransfer' }
							>
						).BankTransferAccountName,
						Mandate_ID: mandateId,
						sort_code: (
							directDebitPaymentMethod as Extract<
								EmailPaymentMethod,
								{ Type: 'BankTransfer' }
							>
						).BankCode,
						payment_method: 'Direct Debit',
						first_payment_date: 'Thursday, 11 December 2025',
						last_name: emailUser.lastName,
						currency: 'GBP',
						billing_period: 'monthly',
						account_number: '******11',
						is_fixed_term: 'false',
						subscriber_id: subscriptionNumber,
						subscription_rate:
							'£10.00 for the first month, then £12.00 every month',
						account_holder: 'Mickey Mouse',
						bank_account_no: '******11',
						bank_sort_code: '20-20-20',
						mandate_id: 'MANDATE_ID',
					},
				},
			},
			DataExtensionName: DataExtensionNames.day0Emails.supporterPlus,
			IdentityUserId: '1234',
		};

		expect(emailFields).toStrictEqual(expected);
	});
	test('should build correct email fields for annual supporter plus with credit card', () => {
		const emailFields = buildSupporterPlusEmailFields({
			today: dayjs(today),
			user: emailUser,
			currency: 'GBP',
			billingPeriod: 'Annual',
			subscriptionNumber: subscriptionNumber,
			paymentSchedule: paymentSchedule,
			paymentMethod: creditCardPaymentMethod,
			isFixedTerm: false,
			taxMode: 'TaxInclusive',
		});
		const expected = {
			To: {
				Address: emailAddress,
				ContactAttributes: {
					SubscriberAttributes: {
						first_name: 'Mickey',
						payment_method: 'Credit/Debit Card',
						first_payment_date: 'Thursday, 11 December 2025',
						last_name: 'Mouse',
						currency: 'GBP',
						billing_period: 'annual',
						is_fixed_term: 'false',
						subscriber_id: subscriptionNumber,
						subscription_rate:
							'£10.00 for the first year, then £12.00 every year',
					},
				},
			},
			DataExtensionName: DataExtensionNames.day0Emails.supporterPlus,
			IdentityUserId: '1234',
		};
		expect(emailFields).toStrictEqual(expected);
	});

	test('should build correct email fields for fixed term subscription', () => {
		const emailFields = buildSupporterPlusEmailFields({
			today: dayjs(today),
			user: emailUser,
			currency: 'GBP',
			billingPeriod: 'Annual',
			subscriptionNumber: subscriptionNumber,
			paymentSchedule: fixedTermPaymentSchedule,
			paymentMethod: directDebitPaymentMethod,
			isFixedTerm: true,
			mandateId: '65HK26E',
			taxMode: 'TaxInclusive',
		});

		const expected = {
			To: {
				Address: emailAddress,
				ContactAttributes: {
					SubscriberAttributes: {
						first_name: 'Mickey',
						account_name: 'Mickey Mouse',
						Mandate_ID: '65HK26E',
						sort_code: '20-20-20',
						payment_method: 'Direct Debit',
						first_payment_date: 'Thursday, 11 December 2025',
						last_name: 'Mouse',
						currency: 'GBP',
						billing_period: 'annual',
						account_number: '******11',
						is_fixed_term: 'true',
						subscriber_id: 'A-S123456',
						subscription_rate: '£9.00 for 12 months',
						account_holder: 'Mickey Mouse',
						bank_account_no: '******11',
						bank_sort_code: '20-20-20',
						mandate_id: '65HK26E',
					},
				},
			},
			DataExtensionName: DataExtensionNames.day0Emails.supporterPlus,
			IdentityUserId: '1234',
		};
		expect(emailFields).toStrictEqual(expected);
	});
});
