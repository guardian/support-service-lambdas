import { catalogSchema } from '@modules/catalog/catalogSchema';
import {
	generateCatalogMapping,
	writeMappingsToFile,
} from '@modules/product/catalogMappingGeneration';
import codeMapping from '@modules/product/codeCatalogMapping.json';
import prodMapping from '@modules/product/prodCatalogMapping.json';
import code from '../../catalog/test/fixtures/catalog-code.json';
import prod from '../../catalog/test/fixtures/catalog-prod.json';

test('We can generate the catalog mapping from a catalog file', () => {
	const codeCatalog = catalogSchema.parse(code);
	const codeCatalogMapping = generateCatalogMapping(codeCatalog);
	const prodCatalog = catalogSchema.parse(prod);
	const prodCatalogMapping = generateCatalogMapping(prodCatalog);
	console.log(JSON.stringify(codeCatalogMapping, null, 2));
	console.log(JSON.stringify(prodCatalogMapping, null, 2));
	expect(codeCatalogMapping).toEqual(codeMapping);
	expect(prodCatalogMapping).toEqual(prodMapping);
});

test('We can write the catalog mapping to a file', async () => {
	await writeMappingsToFile();
});
