import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { generateTypeObject } from '@modules/product-catalog/generateTypeObject';
import prod from '../../zuora-catalog/test/fixtures/catalog-prod.json';

test('Generated product catalog matches snapshot', () => {
	const prodZuoraCatalog = zuoraCatalogSchema.parse(prod);
	const prodProductCatalog = generateProductCatalog(prodZuoraCatalog);
	expect(prodProductCatalog).toMatchSnapshot();
});

test('Generated product catalog types match snapshot', () => {
	const prodZuoraCatalog = zuoraCatalogSchema.parse(prod);
	const prodTypeObject = generateTypeObject(prodZuoraCatalog);
	expect(prodTypeObject).toMatchSnapshot();
});
