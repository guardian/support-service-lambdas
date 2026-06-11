import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import zuoraCatalogFixture from '../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';
import { getDiscountProductRatePlanIds } from '../src/services/discounts';

test('getDiscountProductRatePlanIds returns correct rate plan IDs', () => {
	const prodZuoraCatalog = zuoraCatalogSchema.parse(zuoraCatalogFixture);
	const discountProductRatePlanIds =
		getDiscountProductRatePlanIds(prodZuoraCatalog);
	expect(discountProductRatePlanIds).toContain(
		'8a1282d4880a889501880f817b9d5c7a',
	);
	expect(discountProductRatePlanIds.length).toBe(86);
});
