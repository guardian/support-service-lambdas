import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { Logger } from '@modules/zuora/logger';
import { zuoraSubscriptionResponseSchema } from '@modules/zuora/zuoraSchemas';
import zuoraCatalogFixture from '../../../modules/zuora-catalog/test/fixtures/catalog-code.json';
import { getSupporterPlusData } from '../src/updateSupporterPlusAmount';
import subscriptionJson from './fixtures/subscription.json';

test('We can get a product rate plan from a subscription', () => {
	const productCatalog: ProductCatalog =
		generateProductCatalog(zuoraCatalogFixture);
	const subscription = zuoraSubscriptionResponseSchema.parse(subscriptionJson);

	const supporterPlusPlans = getSupporterPlusData(
		new Logger(),
		productCatalog,
		subscription.ratePlans,
	);
	expect(supporterPlusPlans.productRatePlan.pricing.GBP).toEqual(120);
});
