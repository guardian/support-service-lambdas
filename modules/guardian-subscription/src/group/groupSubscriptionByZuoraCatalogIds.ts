import { groupByToMap } from '@modules/arrayFunctions';
import { groupByUniqueOrThrowMap, mapValuesMap } from '@modules/mapFunctions';
import type { RatePlanCharge } from '@modules/zuora/types';
import type {
	ProductId,
	ProductRatePlanChargeId,
	ProductRatePlanId,
} from '@modules/zuora-catalog/zuoraCatalogSchema';

export type IndexedZuoraSubscriptionRatePlanCharges = Map<
	ProductRatePlanChargeId,
	RatePlanCharge
>;

type IndexedRatePlans<RP> = Map<ProductRatePlanId, readonly RP[]>;

/**
 * Rate plans grouped into a tree, first by product id and then product rate plan id.
 *
 * Generic over the rate plan element type so it can describe both the
 * charge-rich (full) path and the MMA (no charges) path.
 */
export type IndexedRatePlansByProduct<RP> = Map<
	ProductId,
	IndexedRatePlans<RP>
>;

/**
 * Group rate plans into a tree, first by product id and then product rate plan id.
 *
 * This makes the structure match the product-catalog and the Zuora catalog lookup,
 * enabling joining in GuardianSubscriptionParser (both the full and MMA paths).
 *
 * It is generic over the rate plan element type so it can be shared by both the
 * charge-rich path (ZuoraRatePlanWithIndexedCharges) and the MMA/object-query
 * path (MmaZuoraRatePlan), which differ only in whether charges are present.
 *
 * Note that if a sub has multiple of the same product and rateplan, the list
 * will have multiple entries which can be filtered down later.
 */
export function groupSubscriptionByProductAndRatePlanIds<
	RP extends { productId: ProductId; productRatePlanId: ProductRatePlanId },
>(ratePlans: RP[]): IndexedRatePlansByProduct<RP> {
	const ratePlansByProductId = groupByToMap(
		ratePlans,
		(ratePlan) => ratePlan.productId,
	);
	return mapValuesMap(ratePlansByProductId, (productRatePlanMap) =>
		groupByToMap(productRatePlanMap, (ratePlan) => ratePlan.productRatePlanId),
	);
}

export function indexChargeList(
	ratePlanCharges: RatePlanCharge[],
): IndexedZuoraSubscriptionRatePlanCharges {
	return groupByUniqueOrThrowMap(
		ratePlanCharges,
		(charge) => charge.productRatePlanChargeId,
		'duplicate charges',
	);
}
