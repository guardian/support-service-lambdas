import { getIfDefined } from '@modules/nullAndUndefined';
import type {
	Product,
	ProductKey,
	ProductRatePlan,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import {
	type ProductCatalog,
	ProductCatalogHelper,
	type ProductRatePlanChargeKey,
} from '@modules/product-catalog/productCatalog';
import { zuoraCatalogToProductRatePlanChargeKey } from '@modules/product-catalog/zuoraToProductNameMappings';
import type { RatePlanCharge } from '@modules/zuora/types';
import type { ZuoraProductRatePlanCharge } from '@modules/zuora-catalog/zuoraCatalogSchema';
import type { ZuoraProductRatePlanNode } from '../group/buildZuoraProductIdToKey';
import type {
	IndexedZuoraRatePlanWithCharges,
	RestRatePlan,
} from '../group/groupSubscriptionByZuoraCatalogIds';
import type { GenericRatePlan } from './ratePlansBuilder';
import { RatePlansBuilder } from './ratePlansBuilder';

export type GuardianRatePlan<P extends ProductKey = ProductKey> =
	GenericRatePlan<GuardianCatalogValues<P>>;

/**
 * this is what we attach to the rate plans in place of zuora's basic rate plans array.
 *
 * this type looks convoluted, but it means that if we use an if or switch statement
 * to narrow down the product key and rate plan key, we can access the charges
 * by key rather than filtering them.  Also the product and productRatePlan are
 * correctly typed for the product.
 *
 * 	if (
 * 		ratePlan.productKey === 'SupporterPlus' &&
 * 		ratePlan.productRatePlanKey === 'Monthly'
 * 	) {
 * 		const a = ratePlan.product.customerFacingName;
 * 		const b = ratePlan.productRatePlan.pricing.NZD; // NZD doesn't exist for all products
 * 		const c = ratePlan.ratePlanCharges.Contribution.price; // Contribution exists on Monthly (but not all) S+
 * 	}
 *
 * 	if (
 * 		ratePlan.productKey === 'SupporterPlus' &&
 * 		(ratePlan.productRatePlanKey === 'Monthly' ||
 * 			ratePlan.productRatePlanKey === 'Annual')
 * 	) {
 * 		const d = ratePlan.product.customerFacingName;
 * 		const e = ratePlan.productRatePlan.pricing.AUD;
 * 		const f = ratePlan.ratePlanCharges.Contribution.price; // Contribution exists on Monthly and Annual
 * 	}
 *
 */
export type GuardianCatalogValues<P extends ProductKey = ProductKey> = {
	[K in P]: {
		[RPK in ProductRatePlanKey<K>]: {
			productKey: K;
			product: Omit<Product<K>, 'ratePlans'>;
			productRatePlanKey: RPK;
			productRatePlan: Omit<ProductRatePlan<K, RPK>, 'charges'>;
			ratePlanCharges: Record<ProductRatePlanChargeKey<K, RPK>, RatePlanCharge>;
		};
	}[ProductRatePlanKey<K>];
}[P];

/**
 * this gathers the relevant objects from the product catalog and builds a
 * combined rate plan and charge tree of the right type
 */
export class GuardianRatePlanBuilder<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
> {
	private restProduct: Omit<Product<P>, 'ratePlans'>;
	private restProductRatePlan: Omit<ProductRatePlan<P, PRP>, 'charges'>;
	private productCatalogHelper: ProductCatalogHelper;

	constructor(
		private productCatalog: ProductCatalog,
		private productKey: P,
		private productRatePlanKey: PRP,
	) {
		this.productCatalogHelper = new ProductCatalogHelper(this.productCatalog);
		const { restProduct, restProductRatePlan } = this.getProductAndRatePlanData(
			productKey,
			productRatePlanKey,
		);
		this.restProduct = restProduct;
		this.restProductRatePlan = restProductRatePlan;
	}

	/**
	 * extracts the product and rateplan from the product catalog so we can embed
	 * them into the subscription rate plan
	 */
	private getProductAndRatePlanData<
		P extends ProductKey,
		PRP extends ProductRatePlanKey<P>,
	>(productKey: P, productRatePlanKey: PRP) {
		const product: Product<P> = this.productCatalog[productKey];
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- just discarded an omitted variable
		const { ratePlans: _unused1, ...restProduct } = product;
		const productRatePlan = this.productCatalogHelper.getProductRatePlan(
			productKey,
			productRatePlanKey,
		);

		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- discard an omitted variable
		const { charges: _unused2, ...restProductRatePlan } = productRatePlan;
		return { restProduct, restProductRatePlan };
	}

	/**
	 * given that the product and rateplan are in the product catalog, return a modified rate plan object
	 * that contains the product-catalog keys and values, as well as the charges keyed as per the product
	 * catalog.
	 */
	buildGuardianRatePlans(
		productRatePlanNode: ZuoraProductRatePlanNode,
		subscriptionRatePlansForProductRatePlan: readonly IndexedZuoraRatePlanWithCharges[],
	): Array<GuardianRatePlan<P>> {
		const ratePlansBuilder = new RatePlansBuilder<
			GuardianCatalogValues<P>,
			ProductRatePlanChargeKey<P, ProductRatePlanKey<P>>,
			RatePlanCharge
		>(
			productRatePlanNode.productRatePlanCharges,
			this.buildRatePlan.bind(this),
			this.buildRatePlanChargeEntry.bind(this),
		);

		const guardianRatePlans: Array<GuardianRatePlan<P>> =
			ratePlansBuilder.buildGenericRatePlans(
				subscriptionRatePlansForProductRatePlan,
			);

		return guardianRatePlans;
	}

	private buildRatePlan = (
		restRatePlan: RestRatePlan,
		ratePlanCharges: Record<ProductRatePlanChargeKey<P, PRP>, RatePlanCharge>,
	): GuardianRatePlan<P> => {
		return {
			...restRatePlan,
			productKey: this.productKey,
			product: this.restProduct,
			productRatePlanKey: this.productRatePlanKey,
			productRatePlan: this.restProductRatePlan,
			ratePlanCharges: ratePlanCharges,
		};
	};

	private buildRatePlanChargeEntry = (
		restRatePlanCharge: RatePlanCharge,
		zuoraProductRatePlanCharge: ZuoraProductRatePlanCharge,
	): [ProductRatePlanChargeKey<P, ProductRatePlanKey<P>>, RatePlanCharge] => {
		const chargeKey: ProductRatePlanChargeKey<
			P,
			ProductRatePlanKey<P>
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- missing type from underlying record type
		> = getIfDefined(
			zuoraCatalogToProductRatePlanChargeKey[zuoraProductRatePlanCharge.name],
			'some charges of this product are missing from the product-catalog keys lookup',
		) as ProductRatePlanChargeKey<P, ProductRatePlanKey<P>>;
		return [chargeKey, restRatePlanCharge];
	};
}
