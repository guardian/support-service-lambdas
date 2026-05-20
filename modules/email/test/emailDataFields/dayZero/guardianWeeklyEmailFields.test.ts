import dayjs from 'dayjs';
import { DataExtensionNames } from '@modules/email/email';
import { buildGuardianWeeklyEmailFields } from '@modules/email/emailDataFields/dayZero/guardianWeeklyEmailFields';
import { formatDate } from '@modules/email/emailDataFields/dayZero/paymentEmailFields';
import type { EmailGiftRecipient } from '@modules/email/emailDataFields/dayZero/types';
import {
	creditCardPaymentMethod,
	emailAddress,
	emailUser,
	paperPaymentSchedule,
	subscriptionNumber,
} from '../fixtures/emailFields/emailFieldsTestData';

describe('Guardian weekly thank you email fields', () => {
	it('should build correct email fields for monthly domestic', () => {
		const today = dayjs('2025-11-11');
		const firstDeliveryDate = today.add(7, 'day');
		const emailFields = buildGuardianWeeklyEmailFields({
			today: today,
			user: emailUser,
			currency: 'GBP',
			billingPeriod: 'Monthly',
			subscriptionNumber: subscriptionNumber,
			paymentSchedule: paperPaymentSchedule,
			paymentMethod: creditCardPaymentMethod,
			isFixedTerm: false,
			mandateId: undefined,
		});

		const expected = {
			To: {
				Address: emailAddress,
				ContactAttributes: {
					SubscriberAttributes: {
						first_name: emailUser.firstName,
						payment_method: 'Credit/Debit Card',
						delivery_address_line_1: emailUser.billingAddress.lineOne,
						delivery_address_line_2: '',
						delivery_address_town: emailUser.billingAddress.city,
						delivery_postcode: emailUser.billingAddress.postCode,
						delivery_country: 'United Kingdom',
						date_of_second_payment: 'Thursday, 18 December 2025',
						subscription_rate: '£10.00 every month',
						first_payment_date: formatDate(firstDeliveryDate),
						subscriber_id: subscriptionNumber,
						last_name: emailUser.lastName,
					},
				},
			},
			DataExtensionName: DataExtensionNames.day0Emails.guardianWeekly,
			IdentityUserId: '1234',
		};

		expect(emailFields).toStrictEqual(expected);
	});
	test('should build correct email fields for GW gift', () => {
		const today = dayjs('2025-11-11');
		const firstDeliveryDate = today.add(7, 'day');
		const giftRecipient: EmailGiftRecipient = {
			firstName: 'Gift',
			lastName: 'Recipient',
		};
		const emailFields = buildGuardianWeeklyEmailFields({
			today: today,
			user: emailUser,
			currency: 'USD',
			billingPeriod: 'Annual',
			subscriptionNumber: subscriptionNumber,
			paymentSchedule: paperPaymentSchedule,
			paymentMethod: creditCardPaymentMethod,
			isFixedTerm: true,
			mandateId: undefined,
			giftRecipient: giftRecipient,
		});
		const expected = {
			To: {
				Address: emailAddress,
				ContactAttributes: {
					SubscriberAttributes: {
						first_name: emailUser.firstName,
						payment_method: 'Credit/Debit Card',
						delivery_address_line_1: emailUser.billingAddress.lineOne,
						delivery_address_line_2: '',
						delivery_address_town: emailUser.billingAddress.city,
						delivery_postcode: emailUser.billingAddress.postCode,
						delivery_country: 'United Kingdom',
						giftee_first_name: 'Gift',
						giftee_last_name: 'Recipient',
						date_of_second_payment: 'Thursday, 18 December 2025',
						subscription_rate: '$10.00 for 12 months',
						first_payment_date: formatDate(firstDeliveryDate),
						subscriber_id: subscriptionNumber,
						last_name: emailUser.lastName,
					},
				},
			},
			DataExtensionName: DataExtensionNames.day0Emails.guardianWeekly,
			IdentityUserId: '1234',
		};

		expect(emailFields).toStrictEqual(expected);
	});
});
