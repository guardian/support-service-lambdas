import type { RatePlanCharge } from '@modules/zuora/types';
import type {
	CatalogProduct,
	ZuoraProductRatePlan,
	ZuoraProductRatePlanCharge,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import type { ZuoraProductRatePlanNode } from '../group/buildZuoraProductIdToKey';
import type {
	RatePlanWithoutCharges,
	ZuoraRatePlanWithIndexedCharges,
} from '../group/groupSubscriptionByZuoraCatalogIds';
import type { GenericRatePlan } from './ratePlansBuilder';
import { RatePlansBuilder } from './ratePlansBuilder';

type ZuoraProductWithoutRatePlans = Omit<CatalogProduct, 'productRatePlans'>;
type ZuoraProductRatePlanWithoutCharges = Omit<
	ZuoraProductRatePlan,
	'productRatePlanCharges'
>;

/**
 * this is what we attach to the rate plan in place of zuora's basic rate plans array if it's a non-product-catalog one
 * e.g. Discounts or other non-standard products.
 */
type ZuoraCatalogValues = {
	product: ZuoraProductWithoutRatePlans;
	productRatePlan: ZuoraProductRatePlanWithoutCharges;
	ratePlanCharges: Record<string, ZuoraRatePlanCharge>; // index by zuora charge name
};
export type ZuoraRatePlan = GenericRatePlan<ZuoraCatalogValues>;
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
	private ratePlansBuilder: RatePlansBuilder<
		ZuoraCatalogValues,
		string,
		ZuoraRatePlanCharge
	>;

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

		this.ratePlansBuilder = new RatePlansBuilder<
			ZuoraCatalogValues,
			string,
			ZuoraRatePlanCharge
		>(
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
		ratePlanCharges: Record<string, ZuoraRatePlanCharge>,
	): ZuoraRatePlan {
		return {
			...ratePlanWithoutCharges,
			product: this.zuoraProductWithoutRatePlans,
			productRatePlan: this.zuoraProductRatePlanWithoutCharges,
			ratePlanCharges,
		} satisfies GenericRatePlan<ZuoraCatalogValues>;
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
