import type { Catalog } from '../src/catalog.zod';
import { catalogSchema } from '../src/catalog.zod';
import code from './fixtures/catalog-code.json';
import prod from './fixtures/catalog-prod.json';

test('catalogSchema', () => {
	const codeCatalog: Catalog = catalogSchema.parse(code);
	expect(codeCatalog.products.length).toEqual(39);

	const prodCatalog: Catalog = catalogSchema.parse(prod);
	expect(prodCatalog.products.length).toEqual(19);
});
