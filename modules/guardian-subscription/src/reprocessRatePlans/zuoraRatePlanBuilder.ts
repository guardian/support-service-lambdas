import {
	groupCollectByUniqueOrThrowMap,
	objectJoinBijective,
} from '@modules/mapFunctions';
import type { RatePlanCharge } from '@modules/zuora/types';
import type {
	CatalogProduct,
	ZuoraProductRatePlan,
	ZuoraProductRatePlanCharge,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import type {
	ZuoraProductRatePlanChargeIdMap,
	ZuoraProductRatePlanNode,
} from '../group/buildZuoraProductIdToKey';
import type {
	IndexedZuoraSubscriptionRatePlanCharges,
	RatePlanWithoutCharges,
	ZuoraRatePlanWithIndexedCharges,
} from '../group/groupSubscriptionByZuoraCatalogIds';

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
	productCatalogCharges: ZuoraProductRatePlanChargeIdMap;
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
	private productCatalogCharges: ZuoraProductRatePlanChargeIdMap;

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
		this.productCatalogCharges = productRatePlanNode.productRatePlanCharges;
	}

	/**
	 * join the catalog product/rateplan onto each subscription rate plan, carrying
	 * the catalog charge lookup along for the later charge join.
	 *
	 * @param subscriptionRatePlansForProductRatePlan
	 */
	joinProductAndRatePlans<SubRP>(
		subscriptionRatePlansForProductRatePlan: readonly SubRP[],
	): Array<ZuoraRatePlanBeforeCharges<SubRP>> {
		return subscriptionRatePlansForProductRatePlan.map((subRatePlan) => ({
			...subRatePlan,
			product: this.zuoraProductWithoutRatePlans,
			productRatePlan: this.zuoraProductRatePlanWithoutCharges,
			productCatalogCharges: this.productCatalogCharges,
		}));
	}
}

/**
 * the "join the charges" pass for a non-product-catalog rate plan.
 *
 * joins the carried catalog charges (productCatalogCharges) with the
 * subscription charges (ratePlanCharges) to produce the final rate plan with
 * charges keyed by the catalog charge name.
 */
export function joinZuoraRatePlanCharges(
	ratePlan: ZuoraRatePlanBeforeCharges<ZuoraRatePlanWithIndexedCharges>,
): ZuoraRatePlan {
	const { productCatalogCharges, ratePlanCharges, ...rest } = ratePlan;
	return {
		...rest,
		ratePlanCharges: buildZuoraChargesByName(
			productCatalogCharges,
			ratePlanCharges,
		),
	};
}

function buildZuoraChargesByName(
	productCatalogCharges: ZuoraProductRatePlanChargeIdMap,
	subscriptionCharges: IndexedZuoraSubscriptionRatePlanCharges,
): ZuoraChargesByName {
	return groupCollectByUniqueOrThrowMap(
		objectJoinBijective(productCatalogCharges, subscriptionCharges),
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
