/**
 * Tests catalog integration
 *
 * @group integration
 */

import { getProductCatalogFromApi } from '@modules/product/api';
import type { ProductCatalog } from '@modules/product/productCatalog';

test('getCatalogFromApi', async () => {
	const codeCatalog: ProductCatalog = await getProductCatalogFromApi('CODE');
	expect(
		codeCatalog.products.DigitalSubscription.ratePlans.Monthly.pricing.GBP,
	).toEqual(14.99);
});
