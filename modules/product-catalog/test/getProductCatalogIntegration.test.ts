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

test('getCatalogFromApi', async () => {
	const catalog = await getProductCatalogFromApi('PROD');
	expect(catalog.DigitalSubscription.ratePlans.Monthly.pricing.GBP).toEqual(
		14.99,
	);
});
