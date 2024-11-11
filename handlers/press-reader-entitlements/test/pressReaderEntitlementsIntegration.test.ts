/**
 * @group integration
 */

import { getLatestSubscription, getMemberDetails } from '../src';
import { getSupporterProductData } from '../src/dynamo';
import { getIdentityClientAccessToken, getIdentityId } from '../src/identity';
import { buildXml } from '../src/xmlBuilder';

test('Dynamo Integration', async () => {
	const supporterData = await getSupporterProductData('CODE', '110001137');
	expect(supporterData?.length).toEqual(4);
});

test('Entitlements check', async () => {
	const memberDetails = await getLatestSubscription('CODE', '110001137');
	expect(memberDetails).toBeDefined();
});

test('getIdentityClientAccessToken', async () => {
	const accessToken = await getIdentityClientAccessToken();
	expect(accessToken).toBeDefined();
});

test('getIdentityId', async () => {
	const identityId = await getIdentityId(
		'CODE',
		'c20da7c7-4f72-44fb-b719-78879bfab70d',
	);
	expect(identityId).toBe('200149752');
});

test('getMemberDetails', async () => {
	const expected = {
		userID: 'c20da7c7-4f72-44fb-b719-78879bfab70d',
		products: [
			{
				product: {
					productID: 'the-guardian',
					enddate: '2025-09-08',
					startdate: '2023-09-08',
				},
			},
			{
				product: {
					productID: 'the-observer',
					enddate: '2025-09-08',
					startdate: '2023-09-08',
				},
			},
		],
	};
	const memberDetails = await getMemberDetails(
		'CODE',
		'c20da7c7-4f72-44fb-b719-78879bfab70d',
	);
	expect(memberDetails).toStrictEqual(expected);
	console.log(buildXml(memberDetails));
});
