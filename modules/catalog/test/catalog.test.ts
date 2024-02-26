import { ZuoraCatalog } from '@modules/catalog/zuoraCatalog';
import type { Catalog } from '@modules/catalog/zuoraCatalogSchema';
import { zuoraCatalogSchema } from '@modules/catalog/zuoraCatalogSchema';
import code from './fixtures/catalog-code.json';
import prod from './fixtures/catalog-prod.json';

test('catalogSchema', () => {
	const codeCatalog: Catalog = zuoraCatalogSchema.parse(code);
	expect(codeCatalog.products.length).toEqual(39);

	const prodCatalog: Catalog = zuoraCatalogSchema.parse(prod);
	expect(prodCatalog.products.length).toEqual(19);
});

test('getCatalogPriceForCurrency', () => {
	const codeCatalog = new ZuoraCatalog(zuoraCatalogSchema.parse(code));
	const digiSubAnnualId = '2c92c0f94bbffaaa014bc6a4212e205b';
	const price = codeCatalog.getCatalogPrice(digiSubAnnualId, 'GBP');
	expect(price).toEqual(149);
});
