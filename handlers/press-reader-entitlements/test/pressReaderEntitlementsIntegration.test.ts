/**
 * @group integration
 */

import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import zuoraCatalogFixture from '../../../modules/zuora-catalog/test/fixtures/catalog-code.json';
import { getMemberDetails } from '../src';
import { getClientAccessToken, getUserDetails } from '../src/identity';
import { getLatestSubscription } from '../src/supporterProductData';

test('Entitlements check', async () => {
	const productCatalog = generateProductCatalog(zuoraCatalogFixture);
	const memberDetails = await getLatestSubscription(
		'CODE',
		'110001137',
		productCatalog,
	);
	expect(memberDetails).toBeDefined();
});

test('getIdentityId', async () => {
	const accessToken = await getClientAccessToken('CODE');
	expect(accessToken).toBeDefined();
	const userDetails = await getUserDetails(
		accessToken,
		'CODE',
		'c20da7c7-4f72-44fb-b719-78879bfab70d',
	);
	expect(userDetails.identityId).toBe('200149752');
});

test('getMemberDetails', async () => {
	const expected = {
		userID: 'c20da7c7-4f72-44fb-b719-78879bfab70d',
		products: [
			{
				product: {
					productID: 'the-guardian',
					enddate: '2099-01-01',
					startdate: '1821-05-05',
				},
			},
			{
				product: {
					productID: 'the-observer',
					enddate: '2099-01-01',
					startdate: '1821-05-05',
				},
			},
		],
	};
	const memberDetails = await getMemberDetails(
		'CODE',
		'c20da7c7-4f72-44fb-b719-78879bfab70d',
	);
	expect(memberDetails).toStrictEqual(expected);
});
