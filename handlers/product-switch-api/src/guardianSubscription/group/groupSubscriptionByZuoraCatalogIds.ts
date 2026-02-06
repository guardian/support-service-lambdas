import {
	groupBy,
	groupByUniqueOrThrow,
	mapValues,
} from '@modules/arrayFunctions';
import { mapValue } from '@modules/objectFunctions';
import type {
	RatePlan,
	RatePlanCharge,
	ZuoraSubscription,
} from '@modules/zuora/types';

export type RestRatePlan = Omit<RatePlan, 'ratePlanCharges'>;
export type RestSubscription = Omit<ZuoraSubscription, 'ratePlans'>;

export type IndexedZuoraSubscriptionRatePlanCharges = Record<
	string, // product rate plan charge id/name
	RatePlanCharge
>;

export type IndexedZuoraRatePlanWithCharges = RestRatePlan & {
	ratePlanCharges: IndexedZuoraSubscriptionRatePlanCharges;
};

export type IndexedZuoraSubscriptionRatePlans = Record<
	string, // product rate plan id/name
	readonly IndexedZuoraRatePlanWithCharges[] // might have multiple of the same product, e.g. product switch and back again
>;
export type IndexedZuoraSubscriptionRatePlansByProduct = Record<
	string, // product id/name
	IndexedZuoraSubscriptionRatePlans
>;

export type ZuoraSubscriptionByCatalogIds = RestSubscription & {
	products: IndexedZuoraSubscriptionRatePlansByProduct;
};

type Indicies = {
	getProductIndex: (rp: RatePlan) => string;
	getProductRatePlanIndex: (rp: RatePlan) => string;
	getProductRatePlanChargeIndex: (rpc: RatePlanCharge) => string;
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
 * @private
 */
export class ZuoraSubscriptionIndexer {
	private constructor(private indicies: Indicies) {}

	static byProductIds = new ZuoraSubscriptionIndexer({
		getProductIndex: (rp: RatePlan) => rp.productId,

		getProductRatePlanIndex: (rp: RatePlan) => rp.productRatePlanId,

		getProductRatePlanChargeIndex: (rpc: RatePlanCharge) =>
			rpc.productRatePlanChargeId,
	});

	groupSubscription(
		zuoraSubscription: ZuoraSubscription,
	): ZuoraSubscriptionByCatalogIds {
		const { ratePlans, ...restSubscription } = zuoraSubscription;
		const doubleGroupedRatePlans = this.doubleGroupRatePlans(ratePlans);

		return {
			...restSubscription,
			products: doubleGroupedRatePlans,
		};
	}

	doubleGroupRatePlans(
		ratePlans: ZuoraSubscription['ratePlans'],
	): IndexedZuoraSubscriptionRatePlansByProduct {
		const doubleGroupedRatePlans: IndexedZuoraSubscriptionRatePlansByProduct =
			mapValues(this.byProductAndRatePlan(ratePlans), (x) =>
				mapValues(x, (rps) => rps.map((rp) => this.indexTheCharges(rp))),
			);
		return doubleGroupedRatePlans;
	}

	/**
	 * group rate plans into a tree, first by the product id and then product rate plan id
	 *
	 * @param zuoraRatePlanWithChargesByPRPCId
	 */
	private byProductAndRatePlan(
		zuoraRatePlanWithChargesByPRPCId: RatePlan[], //IndexedZuoraRatePlanWithCharges[],
	): Record<string, Record<string, RatePlan[]>> {
		const ratePlansById: Record<string, RatePlan[]> = groupBy(
			zuoraRatePlanWithChargesByPRPCId,
			this.indicies.getProductIndex,
		);
		return mapValues(ratePlansById, (productRatePlanMap) =>
			groupBy(productRatePlanMap, this.indicies.getProductRatePlanIndex),
		);
	}

	/**
	 * replace the ratePlanCharges list with ones that are keyed by PRPC id
	 * @param ratePlan
	 */
	private indexTheCharges(ratePlan: RatePlan): IndexedZuoraRatePlanWithCharges {
		return mapValue(ratePlan, 'ratePlanCharges', (ratePlanCharges) =>
			groupByUniqueOrThrow(
				ratePlanCharges,
				this.indicies.getProductRatePlanChargeIndex,
				'duplicate charges',
			),
		);
	}
}
