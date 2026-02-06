import {
	groupCollectByUniqueOrThrowMap,
	objectJoinBijective,
} from '@modules/mapFunctions';
import { mapValue } from '@modules/objectFunctions';
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

type ZuoraProductWithoutRatePlans = Omit<CatalogProduct, 'productRatePlans'>;
type ZuoraProductRatePlanWithoutCharges = Omit<
	ZuoraProductRatePlan,
	'productRatePlanCharges'
>;

export type ZuoraChargesByName = Map<string, ZuoraRatePlanCharge>;
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
 * if it's not a product catalog product, we build a basic ZuoraRatePlan instead
 *
 * This is mostly useful for Discounts, but there will be other products not represented.
 */
export class ZuoraRatePlanBuilder {
	private zuoraProductWithoutRatePlans: ZuoraProductWithoutRatePlans;
	private zuoraProductRatePlanWithoutCharges: ZuoraProductRatePlanWithoutCharges;
	private productRatePlanCharges: ZuoraProductRatePlanChargeIdMap;

	constructor(
		product: CatalogProduct,
		productRatePlanNode: ZuoraProductRatePlanNode,
	) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- throw away children
		const { productRatePlans: _discard1, ...zuoraProductWithoutRatePlans } =
			product;
		this.zuoraProductWithoutRatePlans = zuoraProductWithoutRatePlans;

		const {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars -- throw away children
			productRatePlanCharges: _discard2,
			...zuoraProductRatePlanWithoutCharges
		} = productRatePlanNode.zuoraProductRatePlan;
		this.zuoraProductRatePlanWithoutCharges =
			zuoraProductRatePlanWithoutCharges;
		this.productRatePlanCharges = productRatePlanNode.productRatePlanCharges;
	}

	/**
	 * main entry point to convert
	 * @param subscriptionRatePlansForProductRatePlan
	 */
	buildZuoraRatePlans(
		subscriptionRatePlansForProductRatePlan: readonly ZuoraRatePlanWithIndexedCharges[],
	): ZuoraRatePlan[] {
		return subscriptionRatePlansForProductRatePlan.map(
			(zuoraSubscriptionRatePlan) =>
				this.buildZuoraRatePlan(zuoraSubscriptionRatePlan),
		);
	}

	private buildZuoraRatePlan(
		zuoraSubscriptionRatePlan: ZuoraRatePlanWithIndexedCharges,
	): ZuoraRatePlan {
		return {
			...mapValue(
				zuoraSubscriptionRatePlan,
				'ratePlanCharges',
				(ratePlanCharges) => this.buildZuoraRatePlanCharges(ratePlanCharges),
			),
			product: this.zuoraProductWithoutRatePlans,
			productRatePlan: this.zuoraProductRatePlanWithoutCharges,
		};
	}

	private buildZuoraRatePlanCharges(
		zuoraSubscriptionRatePlanCharges: IndexedZuoraSubscriptionRatePlanCharges,
	): ZuoraChargesByName {
		return groupCollectByUniqueOrThrowMap(
			objectJoinBijective(
				this.productRatePlanCharges,
				zuoraSubscriptionRatePlanCharges,
			),
			([zuoraProductRatePlanCharge, subCharge]: [
				ZuoraProductRatePlanCharge,
				RatePlanCharge,
			]) =>
				this.buildZuoraRatePlanChargeEntry(
					zuoraProductRatePlanCharge,
					subCharge,
				),
			'duplicate rate plan charge keys',
		);
	}

	private buildZuoraRatePlanChargeEntry(
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
}
