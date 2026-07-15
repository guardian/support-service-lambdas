import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import zuoraCatalogFixture from '../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';
import { getExcludedProductRatePlanIds } from '../src/services/excludedRatePlans';
import { buildSelectActiveRatePlansQuery } from '../src/services/selectActiveRatePlansQuery';

test('buildSelectActiveRatePlansQuery with excluded rate plans', () => {
	const prodZuoraCatalog = zuoraCatalogSchema.parse(zuoraCatalogFixture);
	const excludedProductRatePlanIds =
		getExcludedProductRatePlanIds(prodZuoraCatalog);

	expect(
		buildSelectActiveRatePlansQuery(excludedProductRatePlanIds),
	).toMatchSnapshot();
});
