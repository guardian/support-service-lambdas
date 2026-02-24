/**
 * @group integration
 */

import { DataExtensionNames } from '@modules/email/email';
import { sendToSupporterProductData } from '@modules/supporter-product-data/supporterProductData';
import dayjs from 'dayjs';
import type { SwitchInformation } from '../src/changePlan/prepare/switchInformation';
import { supporterRatePlanItemFromSwitchInformation } from '../src/supporterProductData';

test('supporter product data', async () => {
	const now = dayjs();

	const switchInformation: SwitchInformation = {
		account: {
			id: 'accountId',
			identityId: '999999111',
			emailAddress: 'emailAddress',
			firstName: 'firstName',
			lastName: 'lastName',
			defaultPaymentMethodId: 'defaultPaymentMethodId',
			currency: 'GBP',
			paymentMethodType: 'BankTransfer',
		},
		subscription: {
			subscriptionNumber: 'A-S1234567',
			accountNumber: 'accountNumber',
			previousProductName: 'previousProductName',
			previousRatePlanName: 'previousRatePlanName',
			previousAmount: 1,
			includesContribution: true,
			productRatePlanKey: 'Monthly',
			termStartDate: new Date(),
			ratePlanId: 'contributionRatePlanId',
			chargeIds: ['chargeId'],
		},
		target: {
			productRatePlanId: '8a128ed885fc6ded018602296ace3eb8',
			subscriptionChargeId: 'subscriptionChargeId',
			actualTotalPrice: 10,
			ratePlanName: 'Supporter Plus V2 - Monthly',
			dataExtensionName:
				DataExtensionNames.recurringContributionToSupporterPlusSwitch,
		},
	};

	const result = await sendToSupporterProductData(
		'CODE',
		supporterRatePlanItemFromSwitchInformation(now, switchInformation),
	);

	console.log(result);
	expect(result.$metadata.httpStatusCode).toEqual(200);
});
