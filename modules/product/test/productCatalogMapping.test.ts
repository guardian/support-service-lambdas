import { findDuplicates } from '@modules/arrayFunctions';
import { ZuoraCatalog } from '@modules/catalog/catalog';
import type { Stage } from '@modules/stage';
import { getProductCatalogFromZuoraCatalog } from '@modules/product/productCatalog';
import codeZuoraCatalog from '../../catalog/test/fixtures/catalog-code.json';
import prodZuoraCatalog from '../../catalog/test/fixtures/catalog-prod.json';

const codeProductCatalog = getProductCatalogFromZuoraCatalog(codeZuoraCatalog);
const prodProductCatalog = getProductCatalogFromZuoraCatalog(prodZuoraCatalog);
test('We can find a product rate plan from product details', () => {
	expect(
		codeProductCatalog.getProductRatePlan('SupporterPlus', 'Monthly').id,
	).toBe('8ad08cbd8586721c01858804e3275376');
});

test('We can find a product rate plan charge from product details', () => {
	expect(
		codeProductCatalog.getProductRatePlan('NationalDelivery', 'Everyday')
			.charges.Monday.id,
	).toBe('8ad096ca8992481d018992a3674c18da');
});

test('We can find the price of a product from product details', () => {
	expect(
		codeProductCatalog.getProductRatePlan('HomeDelivery', 'Sixday').pricing.GBP,
	).toBe(68.99);
});

test('We can find product details from a productRatePlanId', () => {
	const productRatePlanId = '2c92c0f84bbfec8b014bc655f4852d9d';
	expect(
		codeProductCatalog.findProductDetails(productRatePlanId),
	).toStrictEqual({
		zuoraProduct: 'DigitalSubscription',
		productRatePlan: 'Monthly',
		id: productRatePlanId,
	});
});

const productExistsInCatalog = (stage: Stage) => {
	const [zuoraCatalog, productCatalog] =
		stage === 'CODE'
			? [new ZuoraCatalog(codeZuoraCatalog), codeProductCatalog]
			: [new ZuoraCatalog(prodZuoraCatalog), prodProductCatalog];
	const allProductDetails = productCatalog.getAllProductDetails();
	allProductDetails.forEach((productDetails) => {
		expect(zuoraCatalog.getCatalogPlan(productDetails.id)).toBeDefined();
	});
};

test('All valid products exist in the catalog', () => {
	productExistsInCatalog('CODE');
	productExistsInCatalog('PROD');
});

test('All product rate plan ids are unique', () => {
	const allProducts = codeProductCatalog
		.getAllProductDetails()
		.concat(prodProductCatalog.getAllProductDetails());
	const productRatePlanIds = allProducts
		.map((product) => {
			return product.id;
		})
		.filter((id) => id !== 'Product option not available for this product');
	const duplicateProductRatePlanIds = findDuplicates(productRatePlanIds);
	console.log(duplicateProductRatePlanIds);
	expect(duplicateProductRatePlanIds.length).toBe(0);
});
