import {
	GuardianRatePlan,
	GuardianRatePlans,
	GuardianSubscription,
} from './guardianSubscriptionParser';
import { getSingleOrThrow } from '@modules/arrayFunctions';
import { objectEntries } from '@modules/objectFunctions';
import { ValidationError } from '@modules/errors';
import {
	GuardianCatalogKeys,
	ProductKey,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import { RestSubscription } from './groupSubscriptionByZuoraCatalogIds';

export type SinglePlanGuardianSubscription = {
	ratePlan: GuardianRatePlan;
} & RestSubscription;
export type GuardianSubscriptionWithKeys = {
	subscription: SinglePlanGuardianSubscription;
	productCatalogKeys: GuardianCatalogKeys<ProductKey>;
};

type PlanWithKeys<P extends ProductKey> = {
	ratePlan: GuardianRatePlan;
	productCatalogKeys: GuardianCatalogKeys<P>;
};

/**
 * this takes a subscription and effectively does a "flatten.getSingle" on it to reduce it down to a single rate plan.
 *
 * It also returns the keys needed to access the associated product catalog entry.
 *
 * @param subWithCurrentPlans
 */
export function getSinglePlanFlattenedSubscriptionOrThrow(
	subWithCurrentPlans: GuardianSubscription,
): GuardianSubscriptionWithKeys {
	const { products, ...restSubWithCurrentPlans } = subWithCurrentPlans;

	const allPlansWithKeys: PlanWithKeys<ProductKey>[] = objectEntries(
		products,
	).flatMap(
		([productKey, ratePlansGroupsByKey]: [
			ProductKey,
			GuardianRatePlans<ProductKey>,
		]) => {
			return objectEntries(ratePlansGroupsByKey).flatMap(
				([productRatePlanKey, ratePlans]: [
					ProductRatePlanKey<typeof productKey>,
					GuardianRatePlan[],
				]): PlanWithKeys<typeof productKey>[] => {
					const productCatalogKeys: GuardianCatalogKeys<typeof productKey> = {
						productKey,
						productRatePlanKey,
					};
					return ratePlans.map((ratePlan) => ({
						productCatalogKeys,
						ratePlan,
					}));
				},
			);
		},
	);

	const { ratePlan, productCatalogKeys } = getSingleOrThrow(
		allPlansWithKeys,
		(msg) =>
			new ValidationError(
				"subscription didn't have exactly one known product: " + msg,
			),
	);
	return {
		subscription: { ...restSubWithCurrentPlans, ratePlan },
		productCatalogKeys,
	};
}
