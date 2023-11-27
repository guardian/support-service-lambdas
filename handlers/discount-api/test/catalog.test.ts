import type { Catalog } from '../src/catalogSchema';
import { catalogSchema } from '../src/catalogSchema';
import code from './fixtures/catalog-code.json';
import prod from './fixtures/catalog-prod.json';

test('catalogSchema', () => {
	const codeCatalog: Catalog = catalogSchema.parse(code);
	expect(codeCatalog.products.length).toEqual(39);

	const prodCatalog: Catalog = catalogSchema.parse(prod);
	expect(prodCatalog.products.length).toEqual(19);
});
