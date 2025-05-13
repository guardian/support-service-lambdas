import { findDuplicates } from '@modules/arrayFunctions';
import type { Stage } from '@modules/stage';
import { ZuoraCatalogHelper } from '@modules/zuora-catalog/zuoraCatalog';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { ProductCatalogHelper } from '@modules/product-catalog/newProductCatalogTypes';
import codeZuoraCatalog from '../../zuora-catalog/test/fixtures/catalog-code.json';
import prodZuoraCatalog from '../../zuora-catalog/test/fixtures/catalog-prod.json';

const codeProductCatalog = generateProductCatalog(codeZuoraCatalog);
const prodProductCatalog = generateProductCatalog(prodZuoraCatalog);
const codeCatalogHelper = new ProductCatalogHelper(codeProductCatalog);
const prodCatalogHelper = new ProductCatalogHelper(prodProductCatalog);
test('We can find a product rate plan from product details', () => {
	expect(codeProductCatalog.SupporterPlus.ratePlans.Monthly.id).toBe(
		'8ad08cbd8586721c01858804e3275376',
	);
});

test('We can find a product rate plan charge from product details', () => {
	expect(
		codeProductCatalog.NationalDelivery.ratePlans.Everyday.charges.Monday.id,
	).toBe('8ad096ca8992481d018992a3674c18da');
});

test('We can find the price of a product from product details', () => {
	expect(codeProductCatalog.HomeDelivery.ratePlans.Sixday.pricing.GBP).toBe(
		73.99,
	);
});

test('We can find product details from a productRatePlanId', () => {
	const productRatePlanId = '2c92c0f84bbfec8b014bc655f4852d9d';
	expect(codeCatalogHelper.findProductDetails(productRatePlanId)).toStrictEqual(
		{
			billingSystem: 'zuora',
			zuoraProduct: 'DigitalSubscription',
			productRatePlan: 'Monthly',
			id: productRatePlanId,
		},
	);
});

test('We can find product details for a Guardian Patron', () => {
	const productRatePlanId = 'guardian_patron';
	expect(codeCatalogHelper.findProductDetails(productRatePlanId)).toStrictEqual(
		{
			billingSystem: 'stripe',
			zuoraProduct: 'GuardianPatron',
			productRatePlan: 'GuardianPatron',
			id: productRatePlanId,
		},
	);
});

const zuoraProductExistsInCatalog = (stage: Stage) => {
	const [zuoraCatalog, productCatalog] =
		stage === 'CODE'
			? [new ZuoraCatalogHelper(codeZuoraCatalog), codeCatalogHelper]
			: [new ZuoraCatalogHelper(prodZuoraCatalog), prodCatalogHelper];
	const allProductDetails =
		productCatalog.getAllProductDetailsForBillingSystem('zuora');

	allProductDetails.forEach((productDetails) => {
		expect(zuoraCatalog.getCatalogPlan(productDetails.id)).toBeDefined();
	});
};

test('All zuora products exist in the zuora catalog', () => {
	zuoraProductExistsInCatalog('CODE');
	zuoraProductExistsInCatalog('PROD');
});

test('All Zuora product rate plan ids are unique', () => {
	const allProducts = codeCatalogHelper
		.getAllProductDetailsForBillingSystem('zuora')
		.concat(prodCatalogHelper.getAllProductDetailsForBillingSystem('zuora'));
	const productRatePlanIds = allProducts
		.map((product) => {
			return product.id;
		})
		.filter((id) => id !== 'Product option not available for this product');
	const duplicateProductRatePlanIds = findDuplicates(productRatePlanIds);
	console.log(duplicateProductRatePlanIds);
	expect(duplicateProductRatePlanIds.length).toBe(0);
});
