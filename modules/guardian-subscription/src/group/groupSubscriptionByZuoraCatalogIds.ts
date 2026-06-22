import { groupByUniqueOrThrowMap } from '@modules/mapFunctions';
import type {
	RatePlan,
	RatePlanCharge,
	ZuoraSubscription,
} from '@modules/zuora/types';
import type { ProductRatePlanChargeId } from '@modules/zuora-catalog/zuoraCatalogSchema';

export type RatePlanWithoutCharges = Omit<RatePlan, 'ratePlanCharges'>;
export type SubscriptionWithoutRatePlans = Omit<ZuoraSubscription, 'ratePlans'>;

export type IndexedZuoraSubscriptionRatePlanCharges = Map<
	ProductRatePlanChargeId,
	RatePlanCharge
>;

export type ZuoraRatePlanWithIndexedCharges = RatePlanWithoutCharges & {
	ratePlanCharges: IndexedZuoraSubscriptionRatePlanCharges;
};

/**
 * replace the ratePlanCharges array with ones that are keyed by PRPC id, while
 * preserving any other data (C) already attached to the rate plan.
 *
 * This makes the charge structure match the product-catalog so the charges can
 * be joined. It is applied lazily - only when we actually have charges to join,
 * just before joining them - so the subscription grouping itself never needs to
 * know about charges (which is what lets the grouping be shared with the MMA
 * path, which has no charges).
 *
 * @param ratePlan
 */
export function indexCharges<C>(
	ratePlan: RatePlan & C,
): ZuoraRatePlanWithIndexedCharges & C {
	const { ratePlanCharges, ...rest } = ratePlan;
	const indexedCharges = groupByUniqueOrThrowMap(
		ratePlanCharges,
		(charge) => charge.productRatePlanChargeId,
		'duplicate charges',
	);
	const indexedRatePlan = {
		...rest,
		ratePlanCharges: indexedCharges,
	};
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- rebuilding the rate plan with indexed charges while preserving the attached data C
	return indexedRatePlan as ZuoraRatePlanWithIndexedCharges & C;
}
