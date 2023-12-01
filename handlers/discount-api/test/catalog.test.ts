import { getCatalogPriceForCurrency } from '../src/catalog';
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

test('getCatalogPriceForCurrency', () => {
	const codeCatalog: Catalog = catalogSchema.parse(code);
	const digiSubAnnualId = '2c92c0f94bbffaaa014bc6a4212e205b';
	const prices = getCatalogPriceForCurrency(
		codeCatalog,
		digiSubAnnualId,
		'GBP',
	);
	expect(prices.reduce((acc, val) => acc + val, 0)).toEqual(149);
});
