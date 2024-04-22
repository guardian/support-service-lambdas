// @group: integration

import { sendToSupporterProductData } from '../src/supporterProductData';
import type { SwitchInformation } from '../src/switchInformation';

test('supporter product data', async () => {
	const switchInformation: SwitchInformation = {
		stage: 'CODE',
		input: {
			price: 10,
			preview: false,
		},
		startNewTerm: true,
		contributionAmount: 0,
		user: {
			identityId: '999999111',
			emailAddress: 'emailAddress',
			firstName: 'firstName',
			lastName: 'lastName',
		},
		subscription: {
			billingPeriod: 'Month',
			subscriptionNumber: 'A-S1234567',
			accountNumber: 'accountNumber',
			previousProductName: 'previousProductName',
			previousRatePlanName: 'previousRatePlanName',
			previousAmount: 1,
			currency: 'GBP',
		},
		catalog: {
			supporterPlus: {
				productRatePlanId: '8a128ed885fc6ded018602296ace3eb8',
				price: 10,
				subscriptionChargeId: 'subscriptionChargeId',
				contributionChargeId: 'contributionChargeId',
			},
			contribution: {
				productRatePlanId: 'contributionProductRatePlanId',
				chargeId: 'chargeId',
			},
		},
	};

	const result = await sendToSupporterProductData(switchInformation);

	console.log(result);
	expect(result.$metadata.httpStatusCode).toEqual(200);
});
