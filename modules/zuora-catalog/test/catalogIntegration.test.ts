/**
 * Tests catalog integration
 *
 * @group integration
 */

import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';

test('getCatalogFromS3', async () => {
	const codeCatalog = await getZuoraCatalogFromS3('CODE');
	expect(codeCatalog.products.length).toEqual(39);
});
