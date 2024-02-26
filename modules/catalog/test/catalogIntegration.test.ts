/**
 * Tests catalog integration
 *
 * @group integration
 */

import type { Catalog } from '@modules/catalog/zuoraCatalogSchema';
import { getZuoraCatalogFromS3 } from '@modules/catalog/S3';

test('getCatalogFromS3', async () => {
	const codeCatalog: Catalog = await getZuoraCatalogFromS3('CODE');
	expect(codeCatalog.products.length).toEqual(39);
});
