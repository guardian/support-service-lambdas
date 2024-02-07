import { findDuplicates } from '@modules/arrayFunctions';
import { ZuoraCatalog } from '@modules/catalog/catalog';
import type { Stage } from '@modules/stage';
import {
	findProductDetails,
	getAllProductDetails,
	getProductRatePlan,
} from '@modules/product/productCatalogMapping';
import codeCatalog from '../../catalog/test/fixtures/catalog-code.json';
import prodCatalog from '../../catalog/test/fixtures/catalog-prod.json';

test('We can find a product rate plan from product details', () => {
	expect(
		getProductRatePlan('CODE', 'Digital', 'SupporterPlus', 'Monthly').id,
	).toBe('8ad08cbd8586721c01858804e3275376');
});

test('We can find a product rate plan charge from product details', () => {
	expect(
		getProductRatePlan('CODE', 'Newspaper', 'NationalDelivery', 'Everyday')
			.charges.Monday,
	).toBe('8ad096ca8992481d018992a3674c18da');
});

test('We can find product details from a productRatePlanId', () => {
	const productRatePlanId = '2c92c0f84bbfec8b014bc655f4852d9d';
	expect(findProductDetails('CODE', productRatePlanId)).toStrictEqual({
		productFamily: 'Digital',
		zuoraProduct: 'DigitalSubscription',
		productRatePlan: 'Monthly',
		id: productRatePlanId,
	});
});

const productExistsInCatalog = (stage: Stage) => {
	const zuoraCatalog =
		stage === 'CODE'
			? new ZuoraCatalog(codeCatalog)
			: new ZuoraCatalog(prodCatalog);
	const allProductDetails = getAllProductDetails(stage);
	allProductDetails.forEach((productDetails) => {
		expect(zuoraCatalog.getCatalogPlan(productDetails.id)).toBeDefined();
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
			return product.id;
		})
		.filter((id) => id !== 'Product option not available for this product');
	const duplicateProductRatePlanIds = findDuplicates(productRatePlanIds);
	console.log(duplicateProductRatePlanIds);
	expect(duplicateProductRatePlanIds.length).toBe(0);
});
