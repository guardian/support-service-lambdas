import {
	GuardianRatePlan,
	GuardianRatePlans,
	GuardianSubscription,
} from './guardianSubscriptionBuilder';
import { getSingleOrThrow, headOption } from '@modules/arrayFunctions';
import { objectEntries } from '@modules/objectFunctions';
import { ValidationError } from '@modules/errors';
import {
	ProductKey,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import { RestSubscription } from './groupSubscriptionByZuoraCatalogIds';

export type AnyGuardianCatalogKeys = GuardianCatalogKeys<ProductKey>;

export type GuardianCatalogKeys<P extends ProductKey> = {
	[P in ProductKey]: {
		productKey: P;
		productRatePlanKey: ProductRatePlanKey<P>;
	};
}[P];

export type SinglePlanGuardianSubscription<P extends ProductKey = ProductKey> =
	PlanWithKeys<P> & RestSubscription;

type PlanWithKeys<P extends ProductKey> = {
	ratePlan: GuardianRatePlan;
	productCatalogKeys: GuardianCatalogKeys<P>;
	// guardianProductWithRatePlan: ConcreteSinglePlanGuardianProduct<P>;
};

/**
 * this takes a subscription and effectively does a "flatten.getSingle" on it to reduce it down to a single rate plan.
 *
 * It also returns the keys needed to access the associated product catalog entry.
 *
 * @param subWithCurrentPlans
 */
export function asSinglePlanGuardianSub(
	subWithCurrentPlans: GuardianSubscription,
): SinglePlanGuardianSubscription<ProductKey> {
	const { products, ...restSubWithCurrentPlans } = subWithCurrentPlans;
	const subWithoutCatalog = {
		...restSubWithCurrentPlans,
		...getSingleOrThrow(
			objectEntries(products).flatMap(
				([productKey, ratePlansGroupsByKey]: [
					ProductKey,
					GuardianRatePlans<ProductKey>,
				]) => {
					return objectEntries(ratePlansGroupsByKey).flatMap(
						([productRatePlanKey, ratePlans]: [
							ProductRatePlanKey<typeof productKey>,
							GuardianRatePlan[],
						]) => {
							const productCatalogKeys: GuardianCatalogKeys<typeof productKey> =
								{
									productKey,
									productRatePlanKey,
								};

							// const guardianProductWithRatePlan: ConcreteSinglePlanGuardianProduct<
							// 	typeof productKey
							// > =
							// 	this.asSinglePlanGuardianProduct<typeof productKey>(
							// 		productCatalogKeys,
							// 	);

							const ratePlan = headOption(
								ratePlans,
								(msg) =>
									new ValidationError(
										'subscription had too many rateplans: ' + msg,
									),
							);
							const result: PlanWithKeys<ProductKey>[] =
								ratePlan === undefined
									? []
									: [
											{
												productCatalogKeys,
												// guardianProductWithRatePlan,
												ratePlan,
											},
										];
							return result;
						},
					);
				},
			),
			(msg) =>
				new ValidationError(
					"subscription didn't have exactly one known product: " + msg,
				),
		),
	};
	return subWithoutCatalog;
}

// export class SSS {
// 	constructor(private productCatalog: ProductCatalog) {}
// 	private asSinglePlanGuardianProduct<P extends ProductKey>(
// 		productCatalogKeys: GuardianCatalogKeys<P>,
// 	) {
// 		const productKey: P = productCatalogKeys.productKey;
// 		const { ratePlans, ...guardianProduct } = this.productCatalog[productKey];
// 		const rps = ratePlans as Product<P>['ratePlans'];
// 		const productRatePlanKey: ProductRatePlanKey<P> =
// 			productCatalogKeys.productRatePlanKey;
// 		const guardianProductRatePlan: ProductRatePlan<
// 			P,
// 			ProductRatePlanKey<P>
// 		> = rps[productRatePlanKey];
//
// 		const guardianProductWithRatePlan: ConcreteSinglePlanGuardianProduct<P> = {
// 			ratePlan: guardianProductRatePlan,
// 			...guardianProduct,
// 		};
// 		return guardianProductWithRatePlan;
// 	}
// }
