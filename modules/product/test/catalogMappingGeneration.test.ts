import { catalogSchema } from '@modules/catalog/catalogSchema';
import { generateCatalogMapping } from '@modules/product/catalogMappingGeneration';
import prod from '../../catalog/test/fixtures/catalog-prod.json';

test('Generated product catalog matches snapshot', () => {
	const prodCatalog = catalogSchema.parse(prod);
	const prodCatalogMapping = generateCatalogMapping(prodCatalog);
	expect(prodCatalogMapping).toMatchSnapshot();
});
