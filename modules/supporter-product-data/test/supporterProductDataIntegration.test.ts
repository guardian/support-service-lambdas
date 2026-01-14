/**
 * @group integration
 */

import dayjs from 'dayjs';
import {
	getSupporterProductData,
	sendToSupporterProductData,
} from '@modules/supporter-product-data/supporterProductData';

test('Dynamo Integration', async () => {
	const supporterData = await getSupporterProductData('CODE', '110001137');
	expect(supporterData?.length).toEqual(4);
	expect(supporterData?.[0]?.contractEffectiveDate.year()).toEqual(2024);
});

test('sendToSupporterProductData Integration', async () => {
	const supporterItem = {
		subscriptionName: 'A-S1234567',
		identityId: '104528145',
		productRatePlanId: '8a128ed885fc6ded018602296ace3eb8',
		productRatePlanName: 'Supporter Plus V2 - Monthly',
		termEndDate: dayjs().add(1, 'week'),
		contractEffectiveDate: dayjs('2024-10-10'),
	};
	const response = await sendToSupporterProductData('CODE', supporterItem);
	expect(response.$metadata.httpStatusCode).toEqual(200);
});
