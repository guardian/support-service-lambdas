import { getSingleOrThrow } from '@modules/arrayFunctions';
import { ValidationError } from '@modules/errors';
import type { ProductKey } from '@modules/product-catalog/productCatalog';
import type {
	IndexedZuoraRatePlanWithCharges,
	RestSubscription,
} from './group/groupSubscriptionByZuoraCatalogIds';
import type {
	GuardianRatePlan,
	GuardianSubscriptionMultiPlan,
	ZuoraRatePlan,
} from './guardianSubscriptionParser';

export type GuardianSubscription<P extends ProductKey = ProductKey> = {
	ratePlan: GuardianRatePlan<P>;
	discountRatePlans: IndexedZuoraRatePlanWithCharges[];
} & RestSubscription;

/**
 * this takes a subscription and effectively does a "flatten.getSingle" on it to reduce it down to a single (required) rate plan.
 * It does the same with any (optional) Discount that is present
 *
 * This is useful because in the guardian, all subscriptions have at most one active rateplan, plus maybe a discount
 */
export function getSinglePlanFlattenedSubscriptionOrThrow(
	groupedGuardianSubscription: GuardianSubscriptionMultiPlan,
): GuardianSubscription {
	const {
		ratePlans,
		productsNotInCatalog,
		...restGroupedGuardianSubscription
	} = groupedGuardianSubscription;

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
		...restGroupedGuardianSubscription,
		ratePlan,
		discountRatePlans,
	} satisfies GuardianSubscription;
}
