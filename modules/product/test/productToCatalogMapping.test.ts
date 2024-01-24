import {
	findProductDetails,
	getAllProductDetails,
	getProductRatePlanId,
} from '@modules/product/productToCatalogMapping';
import { findDuplicates } from '@modules/arrayFunctions';

test('We can find a product rate plan from product details', () => {
	expect(
		getProductRatePlanId('CODE', 'SupporterPlus', 'Digital', 'Monthly'),
	).toBe('8ad08cbd8586721c01858804e3275376');
});
test('We can find product details from a productRatePlanId', () => {
	const productRatePlanId = '2c92c0f84bbfec8b014bc655f4852d9d';
	expect(findProductDetails('CODE', productRatePlanId)).toStrictEqual({
		product: 'DigitalSubscription',
		deliveryOption: 'Digital',
		productOption: 'Monthly',
		productRatePlanId,
	});
});

test('All valid products have a product rate plan id', () => {
	const allProducts = getAllProductDetails('CODE').concat(
		getAllProductDetails('PROD'),
	);
	allProducts.forEach((product) => {
		expect(product.productRatePlanId.length).toBeGreaterThan(0);
	});
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
