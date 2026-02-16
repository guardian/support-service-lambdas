import type { EmailMessageWithUserId } from '@modules/email/email';
import { DataExtensionNames } from '@modules/email/email';
import dayjs from 'dayjs';
import { buildEmailMessage } from '../../../src/changePlan/action/productSwitchEmail';
import type { AccountInformation } from '../../../src/changePlan/prepare/accountInformation';
import type { SubscriptionInformation } from '../../../src/changePlan/prepare/subscriptionInformation';
import type { SwitchInformation } from '../../../src/changePlan/prepare/switchInformation';
import type { TargetInformation } from '../../../src/changePlan/prepare/targetInformation';

test('Email message body is correct', () => {
	const dateOfFirstPayment = dayjs('2024-04-16');
	const emailMessage: EmailMessageWithUserId = buildEmailMessage(
		5.6,
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
					price: '10.00',
					first_payment_amount: '5.60',
					date_of_first_payment: '16 April 2024',
					next_payment_amount: '10.00',
					date_of_next_payment: '16 April 2025',
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
	productRatePlanId: '',
	productRatePlanKey: 'Annual',
	subscriptionNumber: 'A-S123456',
	termStartDate: new Date(0),
};

const testTargetInformation: TargetInformation = {
	actualTotalPrice: 10,
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
