/**
 * @group integration
 */

import { sendToSupporterProductData } from '@modules/supporter-product-data/supporterProductData';
import dayjs from 'dayjs';
import { supporterRatePlanItemFromSwitchInformation } from '../src/supporterProductData';
import { SwitchInformation } from '../src/changePlan/prepare/switchInformation';

test('supporter product data', async () => {
	const switchInformation: SwitchInformation = {
		account: {
			id: 'accountId',
			identityId: '999999111',
			emailAddress: 'emailAddress',
			firstName: 'firstName',
			lastName: 'lastName',
			defaultPaymentMethodId: 'defaultPaymentMethodId',
			currency: 'GBP',
		},
		subscription: {
			subscriptionNumber: 'A-S1234567',
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
			productRatePlanId: '8a128ed885fc6ded018602296ace3eb8',
			subscriptionChargeId: 'subscriptionChargeId',
			actualTotalPrice: 10,
			ratePlanName: 'Supporter Plus V2 - Monthly',
		},
	};

	const result = await sendToSupporterProductData(
		'CODE',
		supporterRatePlanItemFromSwitchInformation(dayjs(), switchInformation),
	);

	console.log(result);
	expect(result.$metadata.httpStatusCode).toEqual(200);
});
