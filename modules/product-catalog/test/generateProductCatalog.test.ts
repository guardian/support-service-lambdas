import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { generateTypeObject } from '@modules/product-catalog/generateTypeObject';
import code from '../../zuora-catalog/test/fixtures/catalog-code.json';
import prod from '../../zuora-catalog/test/fixtures/catalog-prod.json';

describe('prod', () => {
	test('Generated product catalog matches snapshot', () => {
		const prodZuoraCatalog = zuoraCatalogSchema.parse(prod);
		const prodProductCatalog = generateProductCatalog(prodZuoraCatalog);
		console.log(JSON.stringify(prodProductCatalog));
		expect(prodProductCatalog).toMatchSnapshot();
	});

	test('Generated product catalog types match snapshot', () => {
		const prodZuoraCatalog = zuoraCatalogSchema.parse(prod);
		const prodTypeObject = generateTypeObject(prodZuoraCatalog);
		expect(prodTypeObject).toMatchSnapshot();
	});
});

describe('code', () => {
	test('Generated product catalog matches snapshot', () => {
		const codeZuoraCatalog = zuoraCatalogSchema.parse(code);
		const codeProductCatalog = generateProductCatalog(codeZuoraCatalog);
		console.log(JSON.stringify(codeProductCatalog));
		expect(codeProductCatalog).toMatchSnapshot();
	});

	test('Generated product catalog types match snapshot', () => {
		const codeZuoraCatalog = zuoraCatalogSchema.parse(code);
		const codeTypeObject = generateTypeObject(codeZuoraCatalog);
		expect(codeTypeObject).toMatchSnapshot();
	});
});
