/**
 * Tests catalog integration
 *
 * @group integration
 */

import { getProductCatalogFromApi } from '@modules/product-catalog/api';

test('getCatalogFromApi', async () => {
	const codeCatalog = await getProductCatalogFromApi('CODE');
	expect(codeCatalog.DigitalSubscription.ratePlans.Monthly.pricing.GBP).toEqual(
		14.99,
	);
});
