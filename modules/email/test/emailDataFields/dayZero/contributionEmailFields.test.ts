import dayjs from 'dayjs';
import { DataExtensionNames } from '@modules/email/email';
import { buildContributionEmailFields } from '@modules/email/emailDataFields/dayZero/contributionEmailFields';
import {
	directDebitPaymentMethod,
	emailAddress,
	emailUser,
	mandateId,
} from '../fixtures/emailFields/emailFieldsTestData';

describe('contributionEmailFields', () => {
	test('should build the correct email fields for recurring contribution thank you email', () => {
		const today = dayjs('2025-11-11');
		const emailFields = buildContributionEmailFields({
			today: today,
			user: emailUser,
			amount: 5,
			currency: 'GBP',
			billingPeriod: 'Monthly',
			subscriptionNumber: 'SUBSCRIPTION123',
			paymentSchedule: {
				payments: [
					{ date: new Date('2025-11-21'), amount: 5 },
					{ date: new Date('2025-12-21'), amount: 5 },
				],
			},
			paymentMethod: directDebitPaymentMethod,
			mandateId: mandateId,
		});
		const expected = {
			To: {
				Address: emailAddress,
				ContactAttributes: {
					SubscriberAttributes: {
						amount: '5',
						currency: 'GBP',
						first_payment_date: 'Friday, 21 November 2025',
						billing_period: 'monthly',
						payment_method: 'Direct Debit',
						first_name: emailUser.firstName,
						last_name: emailUser.lastName,
						account_holder: 'Mickey Mouse',
						bank_account_no: '******11',
						bank_sort_code: '20-20-20',
						mandate_id: 'MANDATE_ID',
						subscriber_id: 'SUBSCRIPTION123',
						subscription_rate: '£5.00 every month',
					},
				},
			},
			DataExtensionName: DataExtensionNames.day0Emails.recurringContribution,
			IdentityUserId: '1234',
		};
		expect(emailFields).toStrictEqual(expected);
	});
});
