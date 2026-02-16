import { DataExtensionNames } from '@modules/email/email';
import dayjs from 'dayjs';
import type { SwitchInformation } from '../src/changePlan/prepare/switchInformation';
import { supporterRatePlanItemFromSwitchInformation } from '../src/supporterProductData';

const getSwitchInformation = (): SwitchInformation => ({
	account: {
		id: 'accountId',
		identityId: 'identityId',
		emailAddress: 'emailAddress',
		firstName: 'firstName',
		lastName: 'lastName',
		defaultPaymentMethodId: 'defaultPaymentMethodId',
		currency: 'GBP',
		paymentMethodType: 'BankTransfer',
	},
	subscription: {
		subscriptionNumber: 'subscriptionNumber',
		accountNumber: 'accountNumber',
		previousProductName: 'previousProductName',
		previousRatePlanName: 'previousRatePlanName',
		previousAmount: 1,
		includesContribution: true,
		productRatePlanKey: 'Monthly',
		termStartDate: new Date(),
		productRatePlanId: 'contributionProductRatePlanId',
		chargeIds: ['chargeId'],
	},
	target: {
		productRatePlanId: 'supporterPlusProductRatePlanId',
		subscriptionChargeId: 'subscriptionChargeId',
		actualTotalPrice: 1,
		ratePlanName: 'Supporter Plus V2 - Monthly',
		dataExtensionName:
			DataExtensionNames.recurringContributionToSupporterPlusSwitch,
	},
});

test('supporterRatePlanItemFromSwitchInformation works with no contribution element', () => {
	const now = dayjs();
	const switchInformation: SwitchInformation = getSwitchInformation();

	expect(
		supporterRatePlanItemFromSwitchInformation(now, switchInformation),
	).toStrictEqual({
		subscriptionName: 'subscriptionNumber',
		identityId: 'identityId',
		productRatePlanId: 'supporterPlusProductRatePlanId',
		productRatePlanName: 'Supporter Plus V2 - Monthly',
		termEndDate: now.add(1, 'year'),
		contractEffectiveDate: now,
	});
});
