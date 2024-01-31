import { catalogSchema } from '@modules/catalog/catalogSchema';
import { generateCatalogMapping } from '@modules/product/catalogMappingGeneration';
import {
	codeMapping,
	prodMapping,
} from '@modules/product/productCatalogMapping';
import code from '../../catalog/test/fixtures/catalog-code.json';
import prod from '../../catalog/test/fixtures/catalog-prod.json';

test('We can generate the catalog mapping from a catalog file', () => {
	const codeCatalog = catalogSchema.parse(code);
	const codeCatalogMapping = generateCatalogMapping(codeCatalog);
	console.log(JSON.stringify(codeCatalogMapping, null, 2));
	expect(codeCatalogMapping).toEqual(codeMapping);
	const prodCatalog = catalogSchema.parse(prod);
	const prodCatalogMapping = generateCatalogMapping(prodCatalog);
	expect(prodCatalogMapping).toEqual(prodMapping);
});
