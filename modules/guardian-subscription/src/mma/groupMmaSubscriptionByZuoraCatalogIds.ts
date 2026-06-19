import type {
	ProductId,
	ProductRatePlanId,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import { byProductAndRatePlanIds } from '../group/byProductAndRatePlanIds';
import type {
	MmaSubscriptionWithoutRatePlans,
	MmaZuoraRatePlan,
	MmaZuoraSubscription,
} from './mmaSubscriptionTypes';

export type IndexedMmaRatePlans = Map<
	ProductRatePlanId,
	readonly MmaZuoraRatePlan[]
>;

export type IndexedMmaRatePlansByProduct = Map<ProductId, IndexedMmaRatePlans>;

export type MmaSubscriptionByCatalogIds = MmaSubscriptionWithoutRatePlans & {
	products: IndexedMmaRatePlansByProduct;
};

/**
 * MMA/object-query equivalent of groupSubscriptionByIds in
 * group/groupSubscriptionByZuoraCatalogIds.ts.
 *
 * Rejigs a subscription from the object-query API to index rate plans by
 * product*Id, making it easy to join against the Zuora catalog lookup.
 *
 * Unlike the charge-rich equivalent, there is no indexTheCharges step —
 * the object-query expand only provides subscriptions.rateplans (no charges),
 * so rate plans are grouped as-is without charge indexing.
 *
 * Note that if a sub has multiple of the same product and rateplan, the list
 * will have multiple entries which can be filtered down later.
 *
 * @param zuoraSubscription
 */
export function groupMmaSubscriptionByIds(
	zuoraSubscription: MmaZuoraSubscription,
): MmaSubscriptionByCatalogIds {
	const { ratePlans, ...subscriptionWithoutRatePlans } = zuoraSubscription;
	return {
		...subscriptionWithoutRatePlans,
		products: byProductAndRatePlanIds(ratePlans),
	};
}
