import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { productCatalogSchema } from '@modules/product-catalog/productCatalogSchema';
import code from '../../zuora-catalog/test/fixtures/catalog-code.json';
import prod from '../../zuora-catalog/test/fixtures/catalog-prod.json';

test('The generated prod product catalog matches the Zod schema we have defined for it', () => {
	const zuoraCatalog = zuoraCatalogSchema.parse(prod);
	const generatedProductCatalog = generateProductCatalog(zuoraCatalog);
	const parsedProductCatalog = productCatalogSchema.parse(
		generatedProductCatalog,
	);
	expect(parsedProductCatalog).toBeDefined();
});

test('The generated code product catalog matches the Zod schema we have defined for it', () => {
	const zuoraCatalog = zuoraCatalogSchema.parse(code);
	const generatedProductCatalog = generateProductCatalog(zuoraCatalog);
	const parsedProductCatalog = productCatalogSchema.parse(
		generatedProductCatalog,
	);
	expect(parsedProductCatalog).toBeDefined();
});
