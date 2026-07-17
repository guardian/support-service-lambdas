import dayjs from 'dayjs';
import { buildGuardianAdLiteEmailFields } from '@modules/email/dataFields/dayZero/guardianAdLiteEmailFields';
import { DataExtensionNames } from '@modules/email/email';
import {
	creditCardPaymentMethod,
	emailAddress,
	emailUser,
	subscriptionNumber,
} from '../fixtures/emailFieldsTestData';

describe('guardianAdLiteEmailFields', () => {
	test('should build the correct email fields for Guardian Ad-Lite', () => {
		const today = dayjs('2025-10-26');
		const emailFields = buildGuardianAdLiteEmailFields({
			today: today,
			user: emailUser,
			currency: 'GBP',
			subscriptionNumber: subscriptionNumber,
			paymentSchedule: {
				payments: [
					{
						date: new Date('2025-11-11'),
						amount: 10,
						amountWithoutTax: 8,
						taxAmount: 2,
					},
					{
						date: new Date('2025-12-11'),
						amount: 10,
						amountWithoutTax: 8,
						taxAmount: 2,
					},
				],
			},
			paymentMethod: creditCardPaymentMethod,
			taxMode: 'TaxInclusive',
		});
		const expected = {
			To: {
				Address: emailAddress,
				ContactAttributes: {
					SubscriberAttributes: {
						first_payment_date: 'Tuesday, 11 November 2025',
						payment_method: 'Credit/Debit Card',
						subscriber_id: subscriptionNumber,
						subscription_rate: '£10.00 every month',
						first_name: emailUser.firstName,
						last_name: emailUser.lastName,
					},
				},
			},
			DataExtensionName: DataExtensionNames.day0Emails.guardianAdLite,
			IdentityUserId: '1234',
		};
		expect(emailFields).toStrictEqual(expected);
	});
});
