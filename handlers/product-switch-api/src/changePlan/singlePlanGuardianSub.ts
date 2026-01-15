import { GuardianRatePlan, GuardianSubscription } from './highLevelSubParser';
import { getSingleOrThrow } from '@modules/arrayFunctions';
import { objectEntries } from '@modules/objectFunctions';
import { ValidationError } from '@modules/errors';
import {
	ProductKey,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';

export type GuardianCatalogKeys<P extends ProductKey> = {
	productKey: P;
	productRatePlanKey: ProductRatePlanKey<P>;
};
export type SinglePlanGuardianSubscription = {
	ratePlan: GuardianRatePlan;
} & Omit<GuardianSubscription, 'guardianProducts'>;

/**
 * this takes a subscription and effectively does a "get" on it to reduce it down to a single rate plan.
 *
 * It also returns the keys needed to access the associated product catalog entry.
 *
 * @param subWithCurrentPlans
 */
export function asSinglePlanGuardianSub(
	subWithCurrentPlans: GuardianSubscription,
): {
	productCatalogKeys: GuardianCatalogKeys<ProductKey>;
} & SinglePlanGuardianSubscription {
	const { guardianProducts, ...restSubWithCurrentPlans } = subWithCurrentPlans;
	return getSingleOrThrow(
		objectEntries(guardianProducts).flatMap(([productKey, ratePlan]) => {
			return objectEntries(ratePlan).map(
				([productRatePlanKey, ratePlans]: [
					ProductRatePlanKey<typeof productKey>,
					GuardianRatePlan[],
				]) => {
					const ratePlan = getSingleOrThrow(
						ratePlans,
						(msg) =>
							new ValidationError(
								"subscription didn't have exactly one known product: " + msg,
							),
					);
					const result: {
						productCatalogKeys: GuardianCatalogKeys<ProductKey>;
					} & SinglePlanGuardianSubscription = {
						productCatalogKeys: {
							productKey,
							productRatePlanKey,
						},
						ratePlan,
						...restSubWithCurrentPlans,
					};
					return result;
				},
			);
		}),
		(msg) =>
			new ValidationError(
				"subscription didn't have exactly one known product: " + msg,
			),
	);
}
