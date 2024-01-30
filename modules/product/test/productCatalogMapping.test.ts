import { findDuplicates } from '@modules/arrayFunctions';
import { ZuoraCatalog } from '@modules/catalog/catalog';
import {
	findProductDetails,
	getAllProductDetails,
	getProductRatePlanId,
} from '@modules/product/productCatalogMapping';
import type { Stage } from '@modules/stage';
import codeCatalog from '../../catalog/test/fixtures/catalog-code.json';
import prodCatalog from '../../catalog/test/fixtures/catalog-prod.json';

test('We can find a product rate plan from product details', () => {
	expect(
		getProductRatePlanId('CODE', 'Digital', 'SupporterPlus', 'Monthly'),
	).toBe('8ad08cbd8586721c01858804e3275376');
});

test('We can find product details from a productRatePlanId', () => {
	const productRatePlanId = '2c92c0f84bbfec8b014bc655f4852d9d';
	expect(findProductDetails('CODE', productRatePlanId)).toStrictEqual({
		productFamily: 'Digital',
		zuoraProduct: 'DigitalSubscription',
		productRatePlan: 'Monthly',
		productRatePlanId,
	});
});

const productExistsInCatalog = (stage: Stage) => {
	const zuoraCatalog =
		stage === 'CODE'
			? new ZuoraCatalog(codeCatalog)
			: new ZuoraCatalog(prodCatalog);
	const allProductDetails = getAllProductDetails(stage);
	allProductDetails.forEach((productDetails) => {
		expect(
			zuoraCatalog.getCatalogPlan(productDetails.productRatePlanId),
		).toBeDefined();
	});
};

test('All valid products exist in the catalog', () => {
	productExistsInCatalog('CODE');
	productExistsInCatalog('PROD');
});

test('All product rate plan ids are unique', () => {
	const allProducts = getAllProductDetails('CODE').concat(
		getAllProductDetails('PROD'),
	);
	const productRatePlanIds = allProducts
		.map((product) => {
			return product.productRatePlanId;
		})
		.filter((id) => id !== 'Product option not available for this product');
	const duplicateProductRatePlanIds = findDuplicates(productRatePlanIds);
	console.log(duplicateProductRatePlanIds);
	expect(duplicateProductRatePlanIds.length).toBe(0);
});
