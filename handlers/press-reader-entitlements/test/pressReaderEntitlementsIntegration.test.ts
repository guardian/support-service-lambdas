/**
 * @group integration
 */

import { checkEntitlements } from '../src';
import { getSupporterProductData } from '../src/dynamo';

test('Dynamo Integration', async () => {
	const supporterData = await getSupporterProductData('110001137', 'CODE');
	expect(supporterData?.length).toEqual(4);
});

describe('Product Catalog integration', () => {
	test('Entitlements check', async () => {
		const entitled = await checkEntitlements('110001137', 'CODE');
		expect(entitled).toBe(true);
	});
});
