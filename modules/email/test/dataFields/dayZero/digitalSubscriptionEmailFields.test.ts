import dayjs from 'dayjs';
import { buildDigitalSubscriptionEmailFields } from '@modules/email/dataFields/dayZero/digitalSubscriptionEmailFields';
import { DataExtensionNames } from '@modules/email/email';
import {
	directDebitPaymentMethod,
	emailAddress,
	emailUser,
	mandateId,
	subscriptionNumber,
} from '../fixtures/emailFieldsTestData';

describe('digitalSubscriptionEmailFields', () => {
	test('should build the correct email fields for digital subscription thank you email', () => {
		const today = dayjs('2025-10-26');
		const emailFields = buildDigitalSubscriptionEmailFields({
			today: today,
			user: emailUser,
			currency: 'GBP',
			billingPeriod: 'Annual',
			subscriptionNumber: subscriptionNumber,
			paymentSchedule: {
				payments: [
					{
						date: new Date('2025-11-11'),
						amount: 119.9,
						amountWithoutTax: 110,
						taxAmount: 9.9,
					},
				],
			},
			paymentMethod: directDebitPaymentMethod,
			mandateId: mandateId,
			taxMode: 'TaxInclusive',
		});
		const expected = {
			To: {
				Address: emailAddress,
				ContactAttributes: {
					SubscriberAttributes: {
						first_name: emailUser.firstName,
						last_name: emailUser.lastName,
						subscriber_id: subscriptionNumber,
						subscription_rate: '£119.90 for the first year',
						payment_method: 'Direct Debit',
						currency: 'GBP',
						first_payment_date: 'Tuesday, 11 November 2025',
						account_holder: 'Mickey Mouse',
						bank_account_no: '******11',
						bank_sort_code: '20-20-20',
						mandate_id: 'MANDATE_ID',
					},
				},
			},
			DataExtensionName: DataExtensionNames.day0Emails.digitalSubscription,
			IdentityUserId: '1234',
		};
		expect(emailFields).toStrictEqual(expected);
	});
});
