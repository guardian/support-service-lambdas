import type { ProductKey } from '@modules/product-catalog/productCatalog';
import type { subscriptionWithRatePlansSchema } from '@modules/zuora/objectQuery/expandSchemas/subscriptionItemSchema';
import type { z } from 'zod';
import type {
	ZuoraProductRatePlanWithoutCharges,
	ZuoraProductWithoutRatePlans,
} from '../reprocessRatePlans/zuoraRatePlanBuilder';

export type MmaZuoraSubscription = z.infer<
	typeof subscriptionWithRatePlansSchema
>;
export type MmaZuoraRatePlan = MmaZuoraSubscription['ratePlans'][number];

export type MmaSubscriptionWithoutRatePlans = Omit<
	MmaZuoraSubscription,
	'ratePlans'
>;

export type MmaGuardianRatePlan = MmaZuoraRatePlan & {
	productKey: ProductKey;
	productRatePlanKey: string;
};

/**
 * A rate plan that is not in the product catalog (e.g. Discounts).
 * Carries product and productRatePlan from the Zuora catalog so that later
 * pipeline steps (filter, flatten) can identify discounts without re-querying
 * the catalog.
 *
 * Mirrors ZuoraCatalogValues in zuoraRatePlanBuilder.ts, minus ratePlanCharges
 * (which are not fetched in the MMA/object-query path).
 */
export type MmaRatePlanNotInCatalog = MmaZuoraRatePlan & {
	product: ZuoraProductWithoutRatePlans;
	productRatePlan: ZuoraProductRatePlanWithoutCharges;
};

/**
 * Mirrors GuardianSubscriptionMultiPlan for the MMA/object-query path.
 *
 * Contains all rate plans split into two buckets by product catalog membership,
 * but without any further sub-classification (discounts, history).
 * Those splits happen in the filter/flatten steps.
 *
 * See guardianSubscriptionParser.ts for the charge-rich equivalent.
 */
export type MmaGuardianSubscriptionMultiPlan =
	MmaSubscriptionWithoutRatePlans & {
		ratePlans: MmaGuardianRatePlan[];
		productsNotInCatalog: MmaRatePlanNotInCatalog[];
	};
