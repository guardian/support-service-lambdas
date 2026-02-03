import type { RatePlanCharge } from '@modules/zuora/types';
import type {
	CatalogProduct,
	ZuoraProductRatePlan,
	ZuoraProductRatePlanCharge,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import type { ZuoraProductRatePlanNode } from '../group/buildZuoraProductIdToKey';
import type {
	IndexedZuoraRatePlanWithCharges,
	RestRatePlan,
} from '../group/groupSubscriptionByZuoraCatalogIds';
import type { GenericRatePlan } from './ratePlansBuilder';
import { RatePlansBuilder } from './ratePlansBuilder';

/**
 * this is what we attach to the rate plan in place of zuora's basic rate plans array if it's a non-product-catalog one
 * e.g. Discounts or other non-standard products.
 */
type ZuoraCatalogValues = {
	product: Omit<CatalogProduct, 'productRatePlans'>;
	productRatePlan: Omit<ZuoraProductRatePlan, 'productRatePlanCharges'>;
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
	private restProduct: Omit<CatalogProduct, 'productRatePlans'>;
	private restProductRatePlan: Omit<
		ZuoraProductRatePlan,
		'productRatePlanCharges'
	>;
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
		const { productRatePlans: _discard1, ...restProduct } = product;
		this.restProduct = restProduct;
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- throw away children
		const { productRatePlanCharges: _discard2, ...restProductRatePlan } =
			productRatePlanNode.zuoraProductRatePlan;
		this.restProductRatePlan = restProductRatePlan;

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
		subscriptionRatePlansForProductRatePlan: readonly IndexedZuoraRatePlanWithCharges[],
	): ZuoraRatePlan[] {
		return this.ratePlansBuilder.buildGenericRatePlans(
			subscriptionRatePlansForProductRatePlan,
		) satisfies ZuoraRatePlan[];
	}

	private buildRatePlan(
		restRatePlan: RestRatePlan,
		ratePlanCharges: Record<string, ZuoraRatePlanCharge>,
	): ZuoraRatePlan {
		return {
			...restRatePlan,
			product: this.restProduct,
			productRatePlan: this.restProductRatePlan,
			ratePlanCharges,
		} satisfies GenericRatePlan<ZuoraCatalogValues>;
	}
}

const buildRatePlanChargeEntry = (
	restRatePlanCharge: RatePlanCharge,
	productRatePlanCharge: ZuoraProductRatePlanCharge,
) =>
	[
		productRatePlanCharge.name,
		{
			...restRatePlanCharge,
			productRatePlanCharge,
		} satisfies ZuoraRatePlanCharge,
	] as const;
