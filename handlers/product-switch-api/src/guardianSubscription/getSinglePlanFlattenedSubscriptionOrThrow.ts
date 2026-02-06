import { getSingleOrThrow } from '@modules/arrayFunctions';
import { ValidationError } from '@modules/errors';
import type { ProductKey } from '@modules/product-catalog/productCatalog';
import type {
	SubscriptionWithoutRatePlans,
	ZuoraRatePlanWithIndexedCharges,
} from './group/groupSubscriptionByZuoraCatalogIds';
import type { GuardianSubscriptionMultiPlan } from './guardianSubscriptionParser';
import type { GuardianRatePlan } from './reprocessRatePlans/guardianRatePlanBuilder';
import type { ZuoraRatePlan } from './reprocessRatePlans/zuoraRatePlanBuilder';

export type GuardianSubscription<P extends ProductKey = ProductKey> = {
	ratePlan: GuardianRatePlan<P>;
	discountRatePlans: ZuoraRatePlanWithIndexedCharges[];
} & SubscriptionWithoutRatePlans;

/**
 * this takes a subscription and effectively does a "flatten.getSingle" on it to reduce it down to a single (required) rate plan.
 * It does the same with any (optional) Discount that is present
 *
 * This is useful because in the guardian, all subscriptions have at most one active rateplan, plus maybe a discount
 */
export function getSinglePlanFlattenedSubscriptionOrThrow(
	guardianSubscriptionMultiPlan: GuardianSubscriptionMultiPlan,
): GuardianSubscription {
	const {
		ratePlans,
		productsNotInCatalog,
		...guardianSubscriptionWithoutRatePlans
	} = guardianSubscriptionMultiPlan;

	const ratePlan = getSingleOrThrow(
		ratePlans,
		(msg) =>
			new ValidationError(
				"subscription didn't have exactly one known product: " + msg,
			),
	);

	const discountRatePlans: ZuoraRatePlan[] = productsNotInCatalog.filter(
		(rp) => rp.product.name === 'Discounts',
	);

	return {
		...guardianSubscriptionWithoutRatePlans,
		ratePlan,
		discountRatePlans,
	} satisfies GuardianSubscription;
}
