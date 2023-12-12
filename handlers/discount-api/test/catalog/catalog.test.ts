import { ZuoraCatalog } from '../../src/catalog/catalog';
import type { Catalog } from '../../src/catalog/catalogSchema';
import { catalogSchema } from '../../src/catalog/catalogSchema';
import code from '../fixtures/catalog-code.json';
import prod from '../fixtures/catalog-prod.json';

test('catalogSchema', () => {
	const codeCatalog: Catalog = catalogSchema.parse(code);
	expect(codeCatalog.products.length).toEqual(39);

	const prodCatalog: Catalog = catalogSchema.parse(prod);
	expect(prodCatalog.products.length).toEqual(19);
});

test('getCatalogPriceForCurrency', () => {
	const codeCatalog = new ZuoraCatalog(catalogSchema.parse(code));
	const digiSubAnnualId = '2c92c0f94bbffaaa014bc6a4212e205b';
	const prices = codeCatalog.getCatalogPriceOfCharges(digiSubAnnualId, 'GBP');
	expect(prices.reduce((acc, val) => acc + val, 0)).toEqual(149);
});
