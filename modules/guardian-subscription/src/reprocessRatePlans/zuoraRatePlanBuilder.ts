import {
	groupCollectByUniqueOrThrowMap,
	objectJoinBijective,
} from '@modules/mapFunctions';
import type { RatePlan, RatePlanCharge } from '@modules/zuora/types';
import type {
	CatalogProduct,
	ZuoraProductRatePlan,
	ZuoraProductRatePlanCharge,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import type {
	ZuoraProductRatePlanChargeIdMap,
	ZuoraProductRatePlanNode,
} from '../group/buildZuoraProductIdToKey';
import type { IndexedZuoraSubscriptionRatePlanCharges } from '../group/groupSubscriptionByZuoraCatalogIds';
import { indexTheCharges } from '../group/groupSubscriptionByZuoraCatalogIds';

type RatePlanWithoutCharges = Omit<RatePlan, 'ratePlanCharges'>;

export type ZuoraProductWithoutRatePlans = Omit<
	CatalogProduct,
	'productRatePlans'
>;
export type ZuoraProductRatePlanWithoutCharges = Omit<
	ZuoraProductRatePlan,
	'productRatePlanCharges'
>;

export type ZuoraChargesByName = Map<string, ZuoraRatePlanCharge>;

/**
 * The catalog product/rateplan info attached to a non-product-catalog rate plan
 * (e.g. Discounts) once the products and rate plans have been joined, but before
 * the charges have been joined.
 *
 * productCatalogCharges is carried for the later charge join (see
 * joinZuoraRatePlanCharges), or simply left attached and unused for the MMA path
 * which never fetches the subscription charges.
 */
export type ZuoraCatalogValuesBeforeCharges = {
	product: ZuoraProductWithoutRatePlans;
	productRatePlan: ZuoraProductRatePlanWithoutCharges;
	productRatePlanCharges: ZuoraProductRatePlanChargeIdMap;
};

/**
 * A non-product-catalog rate plan after joining the catalog product/rateplan but
 * before joining the charges.
 *
 * Generic over the subscription rate plan type so it works for both the
 * charge-rich (full) path and the MMA (no charges) path.
 */
export type ZuoraRatePlanBeforeCharges<SubRP = RatePlanWithoutCharges> = SubRP &
	ZuoraCatalogValuesBeforeCharges;

/**
 * this is what we attach to the rate plan in place of zuora's basic rate plans array if it's a non-product-catalog one
 * e.g. Discounts or other non-standard products.
 */
type ZuoraCatalogValues = {
	product: ZuoraProductWithoutRatePlans;
	productRatePlan: ZuoraProductRatePlanWithoutCharges;
	ratePlanCharges: ZuoraChargesByName;
};
export type ZuoraRatePlan = ZuoraCatalogValues & RatePlanWithoutCharges;
/**
 * For non-product-catalog charges, we retain the full catalog info
 *
 * (Note: For product-catalog charges, the charge only contains the id so it's not worth keeping)
 */
type ZuoraRatePlanCharge = RatePlanCharge & {
	productRatePlanCharge: ZuoraProductRatePlanCharge;
};

/**
 * if it's not a product catalog product, we attach the basic zuora catalog
 * product/rateplan to the subscription rate plan.
 *
 * This is mostly useful for Discounts, but there will be other products not represented.
 *
 * This is the "join the products and rate plans" pass: it does not touch the
 * charges, it only carries the catalog charge lookup (productCatalogCharges)
 * along for the later "join the charges" pass.
 */
export class ZuoraRatePlanBuilder {
	private zuoraProductWithoutRatePlans: ZuoraProductWithoutRatePlans;
	private zuoraProductRatePlanWithoutCharges: ZuoraProductRatePlanWithoutCharges;
	private productRatePlanCharges: ZuoraProductRatePlanChargeIdMap;

	constructor(
		product: CatalogProduct,
		productRatePlanNode: ZuoraProductRatePlanNode,
	) {
		const { productRatePlans: _discard1, ...zuoraProductWithoutRatePlans } =
			product;
		this.zuoraProductWithoutRatePlans = zuoraProductWithoutRatePlans;

		const {
			productRatePlanCharges: _discard2,
			...zuoraProductRatePlanWithoutCharges
		} = productRatePlanNode.zuoraProductRatePlan;
		this.zuoraProductRatePlanWithoutCharges =
			zuoraProductRatePlanWithoutCharges;
		this.productRatePlanCharges = productRatePlanNode.productRatePlanCharges;
	}

	/**
	 * join the catalog product/rateplan onto each subscription rate plan, carrying
	 * the catalog charge lookup along for the later charge join.
	 *
	 * @param subscriptionRatePlansForProductRatePlan
	 */
	buildZuoraRatePlans<SubRP>(
		subscriptionRatePlansForProductRatePlan: readonly SubRP[],
	): Array<ZuoraRatePlanBeforeCharges<SubRP>> {
		return subscriptionRatePlansForProductRatePlan.map(
			(zuoraSubscriptionRatePlan) =>
				this.buildZuoraRatePlan(zuoraSubscriptionRatePlan),
		);
	}

	private buildZuoraRatePlan<SubRP>(
		zuoraSubscriptionRatePlan: SubRP,
	): ZuoraRatePlanBeforeCharges<SubRP> {
		return {
			...zuoraSubscriptionRatePlan,
			productRatePlanCharges: this.productRatePlanCharges,
			product: this.zuoraProductWithoutRatePlans,
			productRatePlan: this.zuoraProductRatePlanWithoutCharges,
		};
	}
}

/**
 * indexes the charges by name and joins with the zuora equivalent
 * non-product-catalog rate plan whose subscription charges are still a raw array
 * (i.e. straight off the Zuora subscription, not yet indexed).
 */
export function indexAndJoinZuoraRatePlanCharges(
	ratePlan: ZuoraRatePlanBeforeCharges<RatePlan>,
): ZuoraRatePlan {
	const { ratePlanCharges, productRatePlanCharges, ...rest } = ratePlan;
	const zuoraSubscriptionRatePlanCharges: IndexedZuoraSubscriptionRatePlanCharges =
		indexTheCharges(ratePlanCharges);
	return {
		...rest,
		ratePlanCharges: buildZuoraRatePlanCharges(
			productRatePlanCharges,
			zuoraSubscriptionRatePlanCharges,
		),
	};
}

function buildZuoraRatePlanCharges(
	productRatePlanCharges: ZuoraProductRatePlanChargeIdMap,
	zuoraSubscriptionRatePlanCharges: IndexedZuoraSubscriptionRatePlanCharges,
): ZuoraChargesByName {
	return groupCollectByUniqueOrThrowMap(
		objectJoinBijective(
			productRatePlanCharges,
			zuoraSubscriptionRatePlanCharges,
		),
		([zuoraProductRatePlanCharge, subCharge]: [
			ZuoraProductRatePlanCharge,
			RatePlanCharge,
		]) => buildZuoraRatePlanChargeEntry(zuoraProductRatePlanCharge, subCharge),
		'duplicate rate plan charge keys',
	);
}

function buildZuoraRatePlanChargeEntry(
	zuoraProductRatePlanCharge: ZuoraProductRatePlanCharge,
	subCharge: RatePlanCharge,
): [string, ZuoraRatePlanCharge] {
	return [
		zuoraProductRatePlanCharge.name, // key by catalog charge name
		{
			...subCharge,
			productRatePlanCharge: zuoraProductRatePlanCharge,
		},
	] as const;
}
