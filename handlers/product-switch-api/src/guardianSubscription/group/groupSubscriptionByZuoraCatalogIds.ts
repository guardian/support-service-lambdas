import { groupByToMap } from '@modules/arrayFunctions';
import { groupByUniqueOrThrowMap, mapValuesMap } from '@modules/mapFunctions';
import { mapValue } from '@modules/objectFunctions';
import type {
	RatePlan,
	RatePlanCharge,
	ZuoraSubscription,
} from '@modules/zuora/types';
import type {
	ProductId,
	ProductRatePlanChargeId,
	ProductRatePlanId,
} from '@modules/zuora-catalog/zuoraCatalogSchema';

export type RatePlanWithoutCharges = Omit<RatePlan, 'ratePlanCharges'>;
export type SubscriptionWithoutRatePlans = Omit<ZuoraSubscription, 'ratePlans'>;

export type IndexedZuoraSubscriptionRatePlanCharges = Map<
	ProductRatePlanChargeId,
	RatePlanCharge
>;

export type ZuoraRatePlanWithIndexedCharges = RatePlanWithoutCharges & {
	ratePlanCharges: IndexedZuoraSubscriptionRatePlanCharges;
};

export type IndexedZuoraSubscriptionRatePlans = Map<
	ProductRatePlanId,
	readonly ZuoraRatePlanWithIndexedCharges[] // might have multiple of the same product, e.g. product switch and back again
>;
export type IndexedZuoraSubscriptionRatePlansByProduct = Map<
	ProductId,
	IndexedZuoraSubscriptionRatePlans
>;

export type ZuoraSubscriptionByCatalogIds = SubscriptionWithoutRatePlans & {
	products: IndexedZuoraSubscriptionRatePlansByProduct;
};

/**
 * This is similar to buildZuoraProductIdToKey only it works on the
 * subscription instead of the catalog.
 *
 * This rejigs a normal zuora subscription to index everything off the
 * product*Ids or names as required.
 *
 * In the case of product*Id makes it easier to connect a subscription with the
 * catalog
 *
 * In the case of names, it makes non-catalog things like Discounts more
 * usable.
 *
 * Note that if a sub has multiple of the same product and rateplan, the list
 * will have multiple entries which can be filtered down later.
 *
 * @param zuoraSubscription
 */
export function groupSubscriptionByIds(
	zuoraSubscription: ZuoraSubscription,
): ZuoraSubscriptionByCatalogIds {
	const { ratePlans, ...subscriptionWithoutRatePlans } = zuoraSubscription;
	const productIdToProductRatePlanIdToRatePlans: IndexedZuoraSubscriptionRatePlansByProduct =
		groupRatePlansToMatchProductCatalogStructure(ratePlans);

	return {
		...subscriptionWithoutRatePlans,
		products: productIdToProductRatePlanIdToRatePlans,
	};
}

/**
 * this groups the rate plans by the product ids at all three levels
 *
 * @param ratePlans
 */
function groupRatePlansToMatchProductCatalogStructure(
	ratePlans: RatePlan[],
): IndexedZuoraSubscriptionRatePlansByProduct {
	const ratePlanWithIndexedCharges: ZuoraRatePlanWithIndexedCharges[] =
		ratePlans.map(indexTheCharges);
	return byProductAndRatePlanIds(ratePlanWithIndexedCharges);
}

/**
 * group rate plans into a tree, first by the product id and then product rate plan id
 *
 * This makes the structure match the product-catalog.
 *
 * @param zuoraRatePlanWithChargesByPRPCId
 */
function byProductAndRatePlanIds(
	zuoraRatePlanWithChargesByPRPCId: ZuoraRatePlanWithIndexedCharges[],
): Map<ProductId, Map<ProductRatePlanId, ZuoraRatePlanWithIndexedCharges[]>> {
	const ratePlansByProductId = groupByToMap(
		zuoraRatePlanWithChargesByPRPCId,
		(ratePlan) => ratePlan.productId,
	);
	return mapValuesMap(ratePlansByProductId, (productRatePlanMap) =>
		groupByToMap(productRatePlanMap, (ratePlan) => ratePlan.productRatePlanId),
	);
}

/**
 * replace the ratePlanCharges list with ones that are keyed by PRPC id
 *
 * This makes the structure match the product-catalog.
 *
 * @param ratePlan
 */
function indexTheCharges(ratePlan: RatePlan): ZuoraRatePlanWithIndexedCharges {
	return mapValue(ratePlan, 'ratePlanCharges', (ratePlanCharges) =>
		groupByUniqueOrThrowMap(
			ratePlanCharges,
			(charge) => charge.productRatePlanChargeId,
			'duplicate charges',
		),
	);
}
