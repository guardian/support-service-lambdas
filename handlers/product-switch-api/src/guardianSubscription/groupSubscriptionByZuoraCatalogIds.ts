//zuora
import { groupBy, groupByUniqueId, mapValues } from '@modules/arrayFunctions';
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
/**
 * this is a normal zuora subscription, however rateplans are now grouped by product id and rate plan id
 */
export type ZuoraSubscriptionByCatalogIds = RestSubscription & {
	products: IndexedZuoraSubscriptionRatePlansByProduct;
};

type Indicies = {
	getProductIndex: (rp: RestRatePlan) => string;
	getProductRatePlanIndex: (rp: RestRatePlan) => string;
	getProductRatePlanChargeIndex: (rpc: RatePlanCharge) => string;
};

export class ZuoraSubscriptionIndexer {
	private constructor(private indicies: Indicies) {}

	static byProductIds = new ZuoraSubscriptionIndexer({
		getProductIndex: (rp: RestRatePlan) => rp.productId,

		getProductRatePlanIndex: (rp: RestRatePlan) => rp.productRatePlanId,

		getProductRatePlanChargeIndex: (rpc: RatePlanCharge) =>
			rpc.productRatePlanChargeId,
	});

	static byName = new ZuoraSubscriptionIndexer({
		getProductIndex: (rp: RestRatePlan) => rp.productName,

		getProductRatePlanIndex: (rp: RestRatePlan) => rp.ratePlanName,

		getProductRatePlanChargeIndex: (rpc: RatePlanCharge) => rpc.name,
	});

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
	groupSubscription(
		zuoraSubscription: ZuoraSubscription,
	): ZuoraSubscriptionByCatalogIds {
		const { ratePlans, ...restSubscription } = zuoraSubscription;
		const doubleGroupedRatePlans = this.groupRatePlans(ratePlans);

		return {
			...restSubscription,
			products: doubleGroupedRatePlans,
		};
	}

	groupRatePlans(
		ratePlans: ZuoraSubscription['ratePlans'],
	): IndexedZuoraSubscriptionRatePlansByProduct {
		const doubleGroupedRatePlans: IndexedZuoraSubscriptionRatePlansByProduct =
			this.byProductAndRatePlan(
				ratePlans.map((rp) => this.indexTheCharges(rp)),
			);
		return doubleGroupedRatePlans;
	}

	/**
	 * group rate plans into a tree, first by the product id and then product rate plan id
	 *
	 * @param zuoraRatePlanWithChargesByPRPCId
	 */
	private byProductAndRatePlan(
		zuoraRatePlanWithChargesByPRPCId: IndexedZuoraRatePlanWithCharges[],
	): IndexedZuoraSubscriptionRatePlansByProduct {
		return mapValues(
			groupBy(zuoraRatePlanWithChargesByPRPCId, this.indicies.getProductIndex),
			(productRatePlanMap) =>
				groupBy(productRatePlanMap, this.indicies.getProductRatePlanIndex),
		);
	}

	/**
	 * replace the ratePlanCharges list with ones that are keyed by PRPC id
	 * @param ratePlan
	 */
	private indexTheCharges(ratePlan: RatePlan): IndexedZuoraRatePlanWithCharges {
		return mapValue(ratePlan, 'ratePlanCharges', (ratePlanCharges) =>
			groupByUniqueId(
				ratePlanCharges,
				this.indicies.getProductRatePlanChargeIndex,
				'duplicate charges',
			),
		);
	}
}
