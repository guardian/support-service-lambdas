import {
	getMaybeSingleOrThrow,
	getSingleOrThrow,
} from '@modules/arrayFunctions';
import { ValidationError } from '@modules/errors';
import { objectValues } from '@modules/objectFunctions';
import type { ProductKey } from '@modules/product-catalog/productCatalog';
import type {
	IndexedZuoraRatePlanWithCharges,
	IndexedZuoraSubscriptionRatePlans,
	RestSubscription,
} from './groupSubscriptionByZuoraCatalogIds';
import type {
	GuardianRatePlan,
	GuardianRatePlans,
	GuardianSubscriptionWithProducts,
} from './guardianSubscriptionParser';

export type GuardianSubscription = {
	ratePlan: GuardianRatePlan;
	discountRatePlan?: IndexedZuoraRatePlanWithCharges;
} & RestSubscription;

/**
 * this takes a subscription and effectively does a "flatten.getSingle" on it to reduce it down to a single rate plan.
 *
 * It also returns the keys needed to access the associated product catalog entry.
 *
 * @param subWithCurrentPlans
 */
export function getSinglePlanFlattenedSubscriptionOrThrow(
	subWithCurrentPlans: GuardianSubscriptionWithProducts,
): GuardianSubscription {
	const { products, productsNotInCatalog, ...restSubWithCurrentPlans } =
		subWithCurrentPlans;

	const allPlans: GuardianRatePlan[] = objectValues(
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- retaining the product key just causes a huge union
		products as Record<ProductKey, GuardianRatePlans>,
	).flatMap((ratePlansGroupsByKey: GuardianRatePlans) => {
		const ratePlanGroups: GuardianRatePlan[][] = objectValues(
			ratePlansGroupsByKey satisfies Record<string, GuardianRatePlan[]>,
		);
		const ratePlans: GuardianRatePlan[] = ratePlanGroups.flat(1);
		return ratePlans;
	});

	const ratePlan = getSingleOrThrow(
		allPlans,
		(msg) =>
			new ValidationError(
				"subscription didn't have exactly one known product: " + msg,
			),
	);

	const discountRatePlanGroups: IndexedZuoraSubscriptionRatePlans =
		productsNotInCatalog['Discounts'] ?? {};
	const discountRatePlans: IndexedZuoraRatePlanWithCharges[] = objectValues(
		discountRatePlanGroups,
	).flat(1);
	const maybeDiscountRatePlan: IndexedZuoraRatePlanWithCharges | undefined =
		getMaybeSingleOrThrow(
			discountRatePlans,
			(msg) =>
				new ValidationError(
					"subscription didn't have one or zero discounts: " + msg,
				),
		);

	const subscription: GuardianSubscription = {
		...restSubWithCurrentPlans,
		ratePlan,
		discountRatePlan: maybeDiscountRatePlan,
	};
	return subscription;
}
