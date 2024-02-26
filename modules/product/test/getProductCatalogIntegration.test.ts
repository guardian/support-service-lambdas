/**
 * Tests catalog integration
 *
 * @group integration
 */

import type { ProductCatalog } from '@modules/product/productCatalog';
import { getProductCatalogFromS3 } from '@modules/product/S3';

test('getCatalogFromS3', async () => {
	const codeCatalog: ProductCatalog = await getProductCatalogFromS3('CODE');
	expect(
		codeCatalog.products.DigitalSubscription.ratePlans.Monthly.pricing.GBP,
	).toEqual(14.99);
});
