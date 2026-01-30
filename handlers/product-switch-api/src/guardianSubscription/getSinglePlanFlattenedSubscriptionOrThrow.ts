import {
	getMaybeSingleOrThrow,
	getSingleOrThrow,
} from '@modules/arrayFunctions';
import { ValidationError } from '@modules/errors';
import type { ProductKey } from '@modules/product-catalog/productCatalog';
import type {
	IndexedZuoraRatePlanWithCharges,
	RestSubscription,
} from './groupSubscriptionByZuoraCatalogIds';
import type {
	GroupedGuardianSubscription,
	GuardianRatePlan,
	ZuoraRatePlan,
} from './guardianSubscriptionParser';

export type GuardianSubscription<P extends ProductKey = ProductKey> = {
	ratePlan: GuardianRatePlan<P>;
	discountRatePlan?: IndexedZuoraRatePlanWithCharges;
} & RestSubscription;

/**
 * this takes a subscription and effectively does a "flatten.getSingle" on it to reduce it down to a single (required) rate plan.
 * It does the same with any (optional) Discount that is present
 *
 * This is useful because in the guardian, all subscriptions have at most one active rateplan, plus maybe a discount
 */
export function getSinglePlanFlattenedSubscriptionOrThrow(
	groupedGuardianSubscription: GroupedGuardianSubscription,
): GuardianSubscription {
	const {
		ratePlans,
		productsNotInCatalog,
		...restGroupedGuardianSubscription
	} = groupedGuardianSubscription;

	// const allPlans: GuardianRatePlan[] = objectValues(
	// 	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- retaining the product key just causes a huge union
	// 	products as Record<ProductKey, GuardianRatePlans>,
	// ).flatMap((ratePlansGroupsByKey: GuardianRatePlans) => {
	// 	const ratePlanGroups: GuardianRatePlan[][] = objectValues(
	// 		ratePlansGroupsByKey satisfies Record<string, GuardianRatePlan[]>,
	// 	);
	// 	const ratePlans: GuardianRatePlan[] = ratePlanGroups.flat(1);
	// 	return ratePlans;
	// });

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
	const maybeDiscountRatePlan: IndexedZuoraRatePlanWithCharges | undefined =
		getMaybeSingleOrThrow(
			discountRatePlans,
			(msg) =>
				new ValidationError(
					"subscription didn't have one or zero discounts: " + msg,
				),
		);

	const subscription: GuardianSubscription = {
		...restGroupedGuardianSubscription,
		ratePlan,
		discountRatePlan: maybeDiscountRatePlan,
	};
	return subscription;
}
