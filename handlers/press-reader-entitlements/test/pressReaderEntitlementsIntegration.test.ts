/**
 * @group integration
 */

import { getMemberDetails } from '../src';
import { getSupporterProductData } from '../src/dynamo';

test('Dynamo Integration', async () => {
	const supporterData = await getSupporterProductData('110001137', 'CODE');
	expect(supporterData?.length).toEqual(4);
});

describe('Product Catalog integration', () => {
	test('Entitlements check', async () => {
		const memberDetails = await getMemberDetails('110001137', 'CODE');
		expect(memberDetails.products.length).toEqual(2);
	});
});
