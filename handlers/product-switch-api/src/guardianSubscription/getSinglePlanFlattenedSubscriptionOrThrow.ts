import {
	getMaybeSingleOrThrow,
	getSingleOrThrow,
	partitionByType,
} from '@modules/arrayFunctions';
import { ValidationError } from '@modules/errors';
import { objectEntries } from '@modules/objectFunctions';
import type {
	GuardianCatalogKeys,
	ProductKey,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import type {
	ProductKeyWithDiscount,
	ProductWithDiscountRatePlanKey,
} from './buildZuoraProductIdToKey';
import type { RestSubscription } from './groupSubscriptionByZuoraCatalogIds';
import type {
	GuardianRatePlan,
	GuardianRatePlans,
	GuardianSubscription,
} from './guardianSubscriptionParser';

export type SinglePlanGuardianSubscription = {
	ratePlan: GuardianRatePlan;
	discountRatePlan?: GuardianRatePlan;
} & RestSubscription;
export type GuardianSubscriptionWithKeys = {
	subscription: SinglePlanGuardianSubscription;
	productCatalogKeys: GuardianCatalogKeys<ProductKey>;
};

type PlanWithKeys<
	RP extends GuardianCatalogKeysWithDiscount<ProductKeyWithDiscount>,
> = {
	ratePlan: GuardianRatePlan;
	productCatalogKeys: RP;
};

type GuardianCatalogKeysWithDiscount<
	P extends ProductKeyWithDiscount,
	PRP extends
		ProductWithDiscountRatePlanKey<P> = ProductWithDiscountRatePlanKey<P>,
> = {
	[P in ProductKeyWithDiscount]: {
		productKey: P;
		productRatePlanKey: PRP;
	};
}[P];

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

	const allPlansWithKeys: Array<
		PlanWithKeys<GuardianCatalogKeysWithDiscount<ProductKeyWithDiscount>>
	> = objectEntries(products).flatMap(
		([productKey, ratePlansGroupsByKey]: [
			ProductKeyWithDiscount,
			GuardianRatePlans<ProductKeyWithDiscount>,
		]) => {
			return objectEntries(ratePlansGroupsByKey).flatMap(
				([productRatePlanKey, ratePlans]: [
					ProductWithDiscountRatePlanKey<typeof productKey>,
					GuardianRatePlan[],
				]): Array<
					PlanWithKeys<GuardianCatalogKeysWithDiscount<typeof productKey>>
				> => {
					const productCatalogKeys: GuardianCatalogKeysWithDiscount<
						typeof productKey
					> = {
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

	const mainAndDiscountRatePlans: [
		Array<PlanWithKeys<ProductRatePlanKey<ProductKey>>>,
		Array<
			PlanWithKeys<GuardianCatalogKeysWithDiscount<ProductKeyWithDiscount>>
		>,
	] = partitionByType(
		allPlansWithKeys,
		(t): t is PlanWithKeys<ProductRatePlanKey<ProductKey>> =>
			t.productCatalogKeys.productKey !== 'Discounts',
	);
	const [mainRatePlans, discountRatePlans] = mainAndDiscountRatePlans;

	const { ratePlan, productCatalogKeys } = getSingleOrThrow(
		mainRatePlans,
		(msg) =>
			new ValidationError(
				"subscription didn't have exactly one known product: " + msg,
			),
	);
	const maybeDiscount = getMaybeSingleOrThrow(
		discountRatePlans,
		(msg) =>
			new ValidationError(
				"subscription didn't have one or zero discounts: " + msg,
			),
	);
	const subscription: SinglePlanGuardianSubscription = {
		...restSubWithCurrentPlans,
		ratePlan,
		discountRatePlan: maybeDiscount?.ratePlan,
	};
	return {
		subscription,
		productCatalogKeys,
	};
}
