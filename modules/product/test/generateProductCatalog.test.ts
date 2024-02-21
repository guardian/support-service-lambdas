import { catalogSchema } from '@modules/catalog/catalogSchema';
import { generateProductCatalogData } from '@modules/product/generateProductCatalogData';
import prod from '../../catalog/test/fixtures/catalog-prod.json';

test('Generated product catalog matches snapshot', () => {
	const prodCatalog = catalogSchema.parse(prod);
	const prodCatalogMapping = generateProductCatalogData(prodCatalog);
	expect(prodCatalogMapping).toMatchSnapshot();
});
