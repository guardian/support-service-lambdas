import { zuoraDateFormat } from '@modules/zuora/utils';
import dayjs from 'dayjs';
import { supporterRatePlanItemFromSwitchInformation } from '../src/supporterProductData';
import { SwitchInformation } from '../src/changePlan/prepare/switchInformation';

const getSwitchInformation = (): SwitchInformation => ({
	account: {
		id: 'accountId',
		identityId: 'identityId',
		emailAddress: 'emailAddress',
		firstName: 'firstName',
		lastName: 'lastName',
		defaultPaymentMethodId: 'defaultPaymentMethodId',
		currency: 'GBP',
	},
	subscription: {
		subscriptionNumber: 'subscriptionNumber',
		accountNumber: 'accountNumber',
		previousProductName: 'previousProductName',
		previousRatePlanName: 'previousRatePlanName',
		previousAmount: 1,
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
	},
});

test('supporterRatePlanItemFromSwitchInformation works with no contribution element', () => {
	const switchInformation: SwitchInformation = getSwitchInformation();

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
