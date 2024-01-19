import {
	findProductDetails,
	getProductRatePlanId,
} from '@modules/product/productToCatalogMapping';

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
