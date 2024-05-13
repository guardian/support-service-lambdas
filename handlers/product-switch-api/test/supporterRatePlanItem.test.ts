import { zuoraDateFormat } from '@modules/zuora/common';
import dayjs from 'dayjs';
import { supporterRatePlanItemFromSwitchInformation } from '../src/product-switch/supporterProductData';
import type { SwitchInformation } from '../src/product-switch/switchInformation';

const getSwitchInformation = (
	contributionAmount: number,
): SwitchInformation => ({
	stage: 'CODE',
	input: {
		price: 1,
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

	expect(
		supporterRatePlanItemFromSwitchInformation(switchInformation),
	).toStrictEqual({
		subscriptionName: 'subscriptionNumber',
		identityId: 'identityId',
		productRatePlanId: 'supporterPlusProductRatePlanId',
		productRatePlanName: 'Supporter Plus V2 - Monthly',
		termEndDate: zuoraDateFormat(dayjs().add(1, 'year')),
		contractEffectiveDate: zuoraDateFormat(dayjs()),
	});
});

test('supporterRatePlanItemFromSwitchInformation works with a contribution element', () => {
	const switchInformation: SwitchInformation = getSwitchInformation(10);

	expect(
		supporterRatePlanItemFromSwitchInformation(switchInformation),
	).toStrictEqual({
		subscriptionName: 'subscriptionNumber',
		identityId: 'identityId',
		productRatePlanId: 'supporterPlusProductRatePlanId',
		productRatePlanName: 'Supporter Plus V2 - Monthly',
		termEndDate: zuoraDateFormat(dayjs().add(1, 'year')),
		contractEffectiveDate: zuoraDateFormat(dayjs()),
		contributionAmount: {
			amount: 10,
			currency: 'GBP',
		},
	});
});
