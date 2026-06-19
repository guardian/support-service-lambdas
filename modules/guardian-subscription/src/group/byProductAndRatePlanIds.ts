import { groupByToMap } from '@modules/arrayFunctions';
import { mapValuesMap } from '@modules/mapFunctions';
import type {
	ProductId,
	ProductRatePlanId,
} from '@modules/zuora-catalog/zuoraCatalogSchema';

/**
 * Group rate plans into a tree, first by product id and then product rate plan id.
 *
 * This makes the structure match the product-catalog and the Zuora catalog lookup,
 * enabling joining in GuardianSubscriptionParser / MmaGuardianSubscriptionParser.
 *
 * It is generic over the rate plan element type so it can be shared by both the
 * charge-rich path (ZuoraRatePlanWithIndexedCharges) and the MMA/object-query
 * path (MmaZuoraRatePlan), which differ only in whether charges are present.
 *
 * Note that if a sub has multiple of the same product and rateplan, the list
 * will have multiple entries which can be filtered down later.
 */
export function byProductAndRatePlanIds<
	RP extends { productId: ProductId; productRatePlanId: ProductRatePlanId },
>(ratePlans: RP[]): Map<ProductId, Map<ProductRatePlanId, RP[]>> {
	const ratePlansByProductId = groupByToMap(
		ratePlans,
		(ratePlan) => ratePlan.productId,
	);
	return mapValuesMap(ratePlansByProductId, (productRatePlanMap) =>
		groupByToMap(productRatePlanMap, (ratePlan) => ratePlan.productRatePlanId),
	);
}
