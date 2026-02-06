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
	private ratePlansBuilder: RatePlansBuilderZZZ;

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

		this.ratePlansBuilder = new RatePlansBuilderZZZ(
			// 	<
			// 	ZuoraCatalogValues,
			// 	string,
			// 	ZuoraRatePlanCharge
			// >
			productRatePlanNode.productRatePlanCharges,
			this.buildRatePlan.bind(this),
			buildRatePlanChargeEntry,
		);
	}

	buildZuoraRatePlans(
		subscriptionRatePlansForProductRatePlan: readonly ZuoraRatePlanWithIndexedCharges[],
	): ZuoraRatePlan[] {
		return this.ratePlansBuilder.buildGenericRatePlans(
			subscriptionRatePlansForProductRatePlan,
		) satisfies ZuoraRatePlan[];
	}

	private buildRatePlan(
		ratePlanWithoutCharges: RatePlanWithoutCharges,
		ratePlanCharges: ZuoraChargesByName,
	): ZuoraRatePlan {
		return {
			...ratePlanWithoutCharges,
			product: this.zuoraProductWithoutRatePlans,
			productRatePlan: this.zuoraProductRatePlanWithoutCharges,
			ratePlanCharges,
		} satisfies ZuoraRatePlan;
	}
}

const buildRatePlanChargeEntry = (
	ratePlanWithoutChargesCharge: RatePlanCharge,
	productRatePlanCharge: ZuoraProductRatePlanCharge,
) =>
	[
		productRatePlanCharge.name,
		{
			...ratePlanWithoutChargesCharge,
			productRatePlanCharge,
		} satisfies ZuoraRatePlanCharge,
	] as const;

//FIXME flatten this class out
/**
 * this class handles reprocessing a rate plan and its charges to remove the standard charges field
 * and replace with appropriate catalog specific fields.
 */
class RatePlansBuilderZZZ {
	constructor(
		private productRatePlanCharges: ZuoraProductRatePlanChargeIdMap,
		private buildRatePlan: (
			rp: RatePlanWithoutCharges,
			chargesByKey: ZuoraChargesByName,
		) => ZuoraRatePlan,
		private buildRatePlanChargeEntry: (
			s: RatePlanCharge,
			c: ZuoraProductRatePlanCharge,
		) => readonly [string /*name*/, ZuoraRatePlanCharge],
	) {}

	buildGenericRatePlans(
		zuoraSubscriptionRatePlans: readonly ZuoraRatePlanWithIndexedCharges[],
	): ZuoraRatePlan[] {
		return zuoraSubscriptionRatePlans.map(
			(zuoraSubscriptionRatePlan: ZuoraRatePlanWithIndexedCharges) => {
				const { ratePlanCharges, ...ratePlanWithoutCharges } =
					zuoraSubscriptionRatePlan;

				const chargesByKey: ZuoraChargesByName =
					this.buildGuardianRatePlanCharges(ratePlanCharges);

				return this.buildRatePlan(
					ratePlanWithoutCharges,
					chargesByKey,
				) satisfies ZuoraRatePlan;
			},
		);
	}

	private buildGuardianRatePlanCharges(
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
			]) => {
				return this.buildRatePlanChargeEntry(
					subCharge,
					zuoraProductRatePlanCharge,
				);
			},
			'duplicate rate plan charge keys',
		);
	}
}
