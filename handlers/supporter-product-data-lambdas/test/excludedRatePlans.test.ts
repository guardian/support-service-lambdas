import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import zuoraCatalogFixture from '../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';
import { getExcludedProductRatePlanIds } from '../src/services/excludedRatePlans';

test('getExcludedProductRatePlanIds returns correct rate plan IDs', () => {
	const prodZuoraCatalog = zuoraCatalogSchema.parse(zuoraCatalogFixture);
	const excludedProductRatePlanIds =
		getExcludedProductRatePlanIds(prodZuoraCatalog);

	expect(excludedProductRatePlanIds).toContain(
		'8a1282d4880a889501880f817b9d5c7a', // a discount plan
	);
	expect(excludedProductRatePlanIds).toContain(
		'2c92a0fc5a2a49f0015a41f473da233a', // 6 for 6 plan
	);
	expect(excludedProductRatePlanIds.length).toBe(140);
});
