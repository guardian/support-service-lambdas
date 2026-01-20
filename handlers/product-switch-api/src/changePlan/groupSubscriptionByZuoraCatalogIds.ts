//zuora
import {
	groupBy,
	groupSingleOrThrow,
	mapValues,
} from '@modules/arrayFunctions';
import {
	RatePlan,
	RatePlanCharge,
	ZuoraSubscription,
} from '@modules/zuora/types';
import { mapProperty } from '@modules/objectFunctions';

export type RestRatePlan = Omit<RatePlan, 'ratePlanCharges'>;
export type RestSubscription = Omit<ZuoraSubscription, 'ratePlans'>;

export type ZuoraRatePlanChargesByPRPCId = Record<
	string, // product rate plan charge id
	RatePlanCharge
>;

export type ZuoraRatePlanWithChargesByPRPCId = RestRatePlan & {
	ratePlanCharges: ZuoraRatePlanChargesByPRPCId;
};

export type ZuoraPRPIdToSubscriptionRatePlans = Record<
	string, // product rate plan id
	readonly ZuoraRatePlanWithChargesByPRPCId[] // might have multiple of the same product, e.g. product switch and back again
>;
export type ZuoraPIdToPRPIdToSubscriptionRatePlans = Record<
	string, // product id
	ZuoraPRPIdToSubscriptionRatePlans
>;
/**
 * this is a normal zuora subscription, however rateplans are now grouped by product id and rate plan id
 */
export type ZuoraSubscriptionByCatalogIds = RestSubscription & {
	products: ZuoraPIdToPRPIdToSubscriptionRatePlans;
};

/**
 * This rejigs a normal zuora subscription to index everything off the product*Ids
 *
 * This makes it easier to connect a subscription with the catalog
 *
 * Note that if a sub has multiple of the same product and rateplan, the list will have multiple entries.
 *
 * @param zuoraSubscription
 * @private
 */
export function groupSubscriptionByZuoraCatalogIds(
	zuoraSubscription: ZuoraSubscription,
): ZuoraSubscriptionByCatalogIds {
	const { ratePlans, ...restSubscription } = zuoraSubscription;

	const doubleGroupedRatePlans: ZuoraPIdToPRPIdToSubscriptionRatePlans =
		doubleGroupRatePlans(ratePlans.map(indexTheCharges));

	return {
		...restSubscription,
		products: doubleGroupedRatePlans,
	};
}

/**
 * group rate plans into a tree, first by the product id and then product rate plan id
 *
 * @param zuoraRatePlanWithChargesByPRPCId
 */
function doubleGroupRatePlans(
	zuoraRatePlanWithChargesByPRPCId: ZuoraRatePlanWithChargesByPRPCId[],
): ZuoraPIdToPRPIdToSubscriptionRatePlans {
	return mapValues(
		groupBy(zuoraRatePlanWithChargesByPRPCId, (rp) => rp.productId),
		(productRatePlanMap) =>
			groupBy(productRatePlanMap, (rp) => rp.productRatePlanId),
	);
}

/**
 * replace the ratePlanCharges list with ones that are keyed by PRPC id
 * @param ratePlan
 */
function indexTheCharges(ratePlan: RatePlan): ZuoraRatePlanWithChargesByPRPCId {
	return mapProperty(ratePlan, 'ratePlanCharges', (ratePlanCharges) =>
		groupSingleOrThrow(
			ratePlanCharges,
			(rpc) => rpc.productRatePlanChargeId,
			'duplicate charges',
		),
	);
}
