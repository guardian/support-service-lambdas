import dayjs from 'dayjs';
import { supporterRatePlanItemFromSwitchInformation } from '../src/supporterProductData';
import type { SwitchInformation } from '../src/switchInformation';

const getSwitchInformation = (
	contributionAmount: number,
): SwitchInformation => ({
	stage: 'CODE',
	actualTotalPrice: 1,
	input: {
		preview: false,
	},
	startNewTerm: true,
	contributionAmount,
	account: {
		id: 'accountId',
		identityId: 'identityId',
		emailAddress: 'emailAddress',
		firstName: 'firstName',
		lastName: 'lastName',
		defaultPaymentMethodId: 'defaultPaymentMethodId',
	},
	subscription: {
		billingPeriod: 'Month',
		subscriptionNumber: 'subscriptionNumber',
		accountNumber: 'accountNumber',
		previousProductName: 'previousProductName',
		previousRatePlanName: 'previousRatePlanName',
		previousAmount: 1,
		currency: 'GBP',
	},
	catalog: {
		supporterPlus: {
			productRatePlanId: 'supporterPlusProductRatePlanId',
			price: 1,
			subscriptionChargeId: 'subscriptionChargeId',
			contributionChargeId: 'contributionChargeId',
		},
		contribution: {
			productRatePlanId: 'contributionProductRatePlanId',
			chargeId: 'chargeId',
		},
	},
});

test('supporterRatePlanItemFromSwitchInformation works with no contribution element', () => {
	const switchInformation: SwitchInformation = getSwitchInformation(0);
	const now = dayjs();
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

test('supporterRatePlanItemFromSwitchInformation works with a contribution element', () => {
	const switchInformation: SwitchInformation = getSwitchInformation(10);
	const now = dayjs();
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
