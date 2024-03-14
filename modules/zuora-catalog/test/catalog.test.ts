import { ZuoraCatalogHelper } from '@modules/zuora-catalog/zuoraCatalog';
import type { ZuoraCatalog } from '@modules/zuora-catalog/zuoraCatalogSchema';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import code from './fixtures/catalog-code.json';
import prod from './fixtures/catalog-prod.json';

test('catalogSchema', () => {
	const codeCatalog: ZuoraCatalog = zuoraCatalogSchema.parse(code);
	expect(codeCatalog.products.length).toEqual(39);

	const prodCatalog: ZuoraCatalog = zuoraCatalogSchema.parse(prod);
	expect(prodCatalog.products.length).toEqual(19);
});

test('getCatalogPriceForCurrency', () => {
	const codeCatalog = new ZuoraCatalogHelper(zuoraCatalogSchema.parse(code));
	const digiSubAnnualId = '2c92c0f94bbffaaa014bc6a4212e205b';
	const price = codeCatalog.getCatalogPrice(digiSubAnnualId, 'GBP');
	expect(price).toEqual(149);
});
