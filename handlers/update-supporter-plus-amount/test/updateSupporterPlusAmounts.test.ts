import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { zuoraSubscriptionSchema } from '@modules/zuora/zuoraSchemas';
import zuoraCatalogFixture from '../../../modules/zuora-catalog/test/fixtures/catalog-code.json';
import { getSupporterPlusPlans } from '../src/updateSupporterPlusAmount';
import subscriptionJson from './fixtures/subscription.json';

test('We can get a product rate plan from a subscription', () => {
	const productCatalog: ProductCatalog =
		generateProductCatalog(zuoraCatalogFixture);
	const subscription = zuoraSubscriptionSchema.parse(subscriptionJson);

	const supporterPlusPlans = getSupporterPlusPlans(
		productCatalog,
		subscription.ratePlans,
	);
	expect(supporterPlusPlans.productRatePlan.pricing.GBP).toEqual(95);
});
