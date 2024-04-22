import { zuoraDateFormat } from '@modules/zuora/common';
import dayjs from 'dayjs';
import { supporterRatePlanItemFromSwitchInformation } from '../src/supporterProductData';
import type { SwitchInformation } from '../src/switchInformation';

test('supporterRatePlanItemFromSwitchInformation works with no contribution element', () => {
	const switchInformation: SwitchInformation = {
		stage: 'CODE',
		input: {
			price: 1,
			preview: false,
		},
		startNewTerm: true,
		contributionAmount: 0,
		user: {
			identityId: 'identityId',
			emailAddress: 'emailAddress',
			firstName: 'firstName',
			lastName: 'lastName',
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
	};

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
	const switchInformation: SwitchInformation = {
		stage: 'CODE',
		input: {
			price: 1,
			preview: false,
		},
		startNewTerm: true,
		contributionAmount: 10,
		user: {
			identityId: 'identityId',
			emailAddress: 'emailAddress',
			firstName: 'firstName',
			lastName: 'lastName',
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
	};

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
