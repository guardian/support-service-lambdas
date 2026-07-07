import dayjs from 'dayjs';
import type { EmailMessageWithUserId } from '@modules/email/email';
import { DataExtensionNames } from '@modules/email/email';
import { buildEmailMessage } from '../../../src/changePlan/action/productSwitchEmail';
import type { AccountInformation } from '../../../src/changePlan/prepare/accountInformation';
import type { SubscriptionInformation } from '../../../src/changePlan/prepare/subscriptionInformation';
import type { SwitchInformation } from '../../../src/changePlan/prepare/switchInformation';
import type { TargetInformation } from '../../../src/changePlan/prepare/targetInformation';

test('Email message body is correct', () => {
	const testPaymentSchedule = [
		{ date: new Date(2026, 5, 29), total: 12.21 },
		{ date: new Date(2027, 5, 29), total: 12.21 },
	];

	const dateOfFirstPayment = dayjs('2024-04-16');
	const emailMessage: EmailMessageWithUserId = buildEmailMessage(
		5.6,
		testPaymentSchedule,
		testSwitchInformation,
		dateOfFirstPayment,
	);

	const expectedOutput = {
		To: {
			Address: emailAddress,
			ContactAttributes: {
				SubscriberAttributes: {
					first_name: 'test',
					last_name: 'user',
					currency: '£',
					first_payment_amount: '5.60',
					date_of_first_payment: '16 April 2024',
					subscription_rate: '£12.21 every year',
					date_of_next_payment: '29 June 2026',
					payment_frequency: 'Annually',
					payment_method: 'Direct Debit',
					subscription_id: 'A-S123456',
				},
			},
		},
		DataExtensionName: 'SV_RCtoSP_Switch',
		IdentityUserId: '123456789',
	};
	expect(emailMessage).toStrictEqual(expectedOutput);
});

test('Email subscription_rate is correct during a discount', () => {
	const testDiscountedPaymentSchedule = [
		{ date: new Date(2026, 5, 29), total: 8.21 },
		{ date: new Date(2027, 5, 29), total: 12.21 },
	];

	const dateOfFirstPayment = dayjs('2024-04-16');
	const emailMessage: EmailMessageWithUserId = buildEmailMessage(
		5.6,
		testDiscountedPaymentSchedule,
		testSwitchInformation,
		dateOfFirstPayment,
	);

	const expectedSubscriptionRate =
		'£8.21 for the first year, then £12.21 every year';
	const actualSubsciptionRate =
		emailMessage.To.ContactAttributes.SubscriberAttributes.subscription_rate;
	expect(actualSubsciptionRate).toEqual(expectedSubscriptionRate);
});

const emailAddress = 'test@thegulocal.com';

const testAccountInformation: AccountInformation = {
	currency: 'GBP',
	defaultPaymentMethodId: '',
	emailAddress: emailAddress,
	firstName: 'test',
	id: '',
	identityId: '123456789',
	lastName: 'user',
	paymentMethodType: 'BankTransfer',
};

const testSubscriptionInformation: SubscriptionInformation = {
	accountNumber: '',
	chargeIds: [''],
	chargedThroughDate: undefined,
	includesContribution: false,
	previousAmount: 0,
	previousProductName: '',
	previousRatePlanName: '',
	ratePlanId: '',
	productRatePlanKey: 'Annual',
	subscriptionNumber: 'A-S123456',
};

const testTargetInformation: TargetInformation = {
	ongoingPrice: 10,
	contributionCharge: undefined,
	dataExtensionName:
		DataExtensionNames.recurringContributionToSupporterPlusSwitch,
	discount: undefined,
	productRatePlanId: '',
	ratePlanName: '',
	subscriptionChargeId: '',
};

const testSwitchInformation: SwitchInformation = {
	account: testAccountInformation,
	subscription: testSubscriptionInformation,
	target: testTargetInformation,
};
