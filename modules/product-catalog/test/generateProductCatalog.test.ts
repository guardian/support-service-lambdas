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
});

describe.skip('The generated schema', () => {
	const [codeZuoraCatalog, prodZuoraCatalog] = [
		zuoraCatalogSchema.parse(code),
		zuoraCatalogSchema.parse(prod),
	];
	const [codeProductCatalog, prodProductCatalog] = [
		generateProductCatalog(codeZuoraCatalog),
		generateProductCatalog(prodZuoraCatalog),
	];

	const [codeParseResult, prodParseResult] = [
		productCatalogSchema.parse(codeProductCatalog),
		productCatalogSchema.parse(prodProductCatalog),
	];

	test('works for CODE', () => {
		expect(codeParseResult).toEqual(codeProductCatalog);
		expect(codeParseResult.OneTimeContribution.billingSystem).toBe('stripe');
		expect(
			Object.keys(codeParseResult.TierThree.ratePlans.DomesticAnnualV2.charges)
				.length,
		).toBe(3);
	});

	test('works for PROD', () => {
		expect(prodParseResult).toEqual(prodProductCatalog);
		expect(prodParseResult.OneTimeContribution.billingSystem).toBe('stripe');
		expect(
			Object.keys(prodParseResult.TierThree.ratePlans.DomesticAnnualV2.charges)
				.length,
		).toBe(3);
	});
});
