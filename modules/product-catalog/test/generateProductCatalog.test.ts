import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import { generateProductBillingPeriods } from '@modules/product-catalog/generateProductBillingPeriods';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { productCatalogSchema } from '@modules/product-catalog/productCatalogSchema';
import code from '../../zuora-catalog/test/fixtures/catalog-code.json';
import prod from '../../zuora-catalog/test/fixtures/catalog-prod.json';

describe('prod', () => {
	test('Generated product catalog matches snapshot', () => {
		const prodZuoraCatalog = zuoraCatalogSchema.parse(prod);
		const prodProductCatalog = generateProductCatalog(prodZuoraCatalog);
		console.log(JSON.stringify(prodProductCatalog));
		expect(prodProductCatalog).toMatchSnapshot();
	});

	test('Generated product billing types match snapshot', () => {
		const prodZuoraCatalog = zuoraCatalogSchema.parse(prod);
		const prodTypeObject = generateProductBillingPeriods(prodZuoraCatalog);
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

	test('Generated product billing period types match snapshot', () => {
		const codeZuoraCatalog = zuoraCatalogSchema.parse(code);
		const codeTypeObject = generateProductBillingPeriods(codeZuoraCatalog);
		expect(codeTypeObject).toMatchSnapshot();
	});

	test('The generated product schema works', () => {
		const prodZuoraCatalog = zuoraCatalogSchema.parse(prod);
		const prodProductCatalog = generateProductCatalog(prodZuoraCatalog);
		const result = productCatalogSchema.parse(prodProductCatalog);
		expect(result).toEqual(prodProductCatalog);
		expect(result.OneTimeContribution.billingSystem).toBe('stripe');
		expect(
			Object.keys(result.TierThree.ratePlans.DomesticAnnualV2.charges).length,
		).toBe(3);
	});
});
