/**
 * Tests catalog integration
 *
 * @group integration
 */

import { getCatalogFromS3 } from '../src/catalog';
import type { Catalog } from '../src/catalog.zod';

test('getCatalogFromS3', async () => {
	const codeCatalog: Catalog = await getCatalogFromS3('CODE');
	expect(codeCatalog.products.length).toEqual(39);
});
