import { catalogSchema } from '@modules/catalog/catalogSchema';
import { generateProductCatalog } from '@modules/product/generateProductCatalog';
import prod from '../../catalog/test/fixtures/catalog-prod.json';

test('Generated product catalog matches snapshot', () => {
	const prodCatalog = catalogSchema.parse(prod);
	const prodCatalogMapping = generateProductCatalog(prodCatalog);
	expect(prodCatalogMapping).toMatchSnapshot();
});
