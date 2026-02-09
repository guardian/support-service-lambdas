import type { EmailMessageWithUserId } from '@modules/email/email';
import { DataExtensionNames } from '@modules/email/email';
import dayjs from 'dayjs';
import { buildEmailMessage } from '../../../src/changePlan/action/productSwitchEmail';

test('Email message body is correct', () => {
	const emailAddress = 'test@thegulocal.com';
	const dateOfFirstPayment = dayjs('2024-04-16');
	const emailMessage: EmailMessageWithUserId = buildEmailMessage(
		DataExtensionNames.recurringContributionToSupporterPlusSwitch,
		{
			first: {
				date: dateOfFirstPayment,
				amount: 5.6,
			},
			next: {
				date: dateOfFirstPayment.add(12, 'month'),
				amount: 10,
			},
		},
		emailAddress,
		'test',
		'user',
		'GBP',
		10,
		'Month',
		'BankTransfer',
		'A-S123456',
		'123456789',
	);

	const expectedOutput = {
		To: {
			Address: 'test@thegulocal.com',
			ContactAttributes: {
				SubscriberAttributes: {
					first_name: 'test',
					last_name: 'user',
					currency: '£',
					price: '10.00',
					first_payment_amount: '5.60',
					date_of_first_payment: '16 April 2024',
					next_payment_amount: '10.00',
					date_of_next_payment: '16 April 2025',
					payment_frequency: 'Monthly',
					subscription_id: 'A-S123456',
				},
			},
		},
		DataExtensionName: 'SV_RCtoSP_Switch',
		IdentityUserId: '123456789',
	};
	expect(emailMessage).toStrictEqual(expectedOutput);
});
