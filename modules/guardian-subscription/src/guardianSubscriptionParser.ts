import { joinAllLeft } from '@modules/mapFunctions';
import type {
	GuardianCatalogKeys,
	ProductCatalog,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import {
	zuoraCatalogToProductKey,
	zuoraCatalogToProductRatePlanKey,
} from '@modules/product-catalog/zuoraToProductNameMappings';
import type { ZuoraSubscription } from '@modules/zuora/types';
import type {
	CatalogProduct,
	ZuoraCatalog,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import type {
	ZuoraProductIdMap,
	ZuoraProductRatePlanNode,
} from './group/buildZuoraProductIdToKey';
import { buildZuoraProductIdToKey } from './group/buildZuoraProductIdToKey';
import type {
	SubscriptionWithoutRatePlans,
	ZuoraRatePlanWithIndexedCharges,
} from './group/groupSubscriptionByZuoraCatalogIds';
import { groupSubscriptionByIds } from './group/groupSubscriptionByZuoraCatalogIds';
import type { GuardianRatePlanMap } from './reprocessRatePlans/guardianRatePlanBuilder';
import { GuardianRatePlanBuilder } from './reprocessRatePlans/guardianRatePlanBuilder';
import type { ZuoraRatePlan } from './reprocessRatePlans/zuoraRatePlanBuilder';
import { ZuoraRatePlanBuilder } from './reprocessRatePlans/zuoraRatePlanBuilder';

/**
 * This represents what extra info we attach to the subscription to make a "guardian" subscription.
 */
type RatePlansWithCatalogData = {
	ratePlans: GuardianRatePlanMap[];
	productsNotInCatalog: ZuoraRatePlan[]; // slightly different type needed with zuora catalog attached
};

/**
 * represents a zuora subscription that has been augmented with guardian and zuora catalog information
 */
export type GuardianSubscriptionMultiPlan = RatePlansWithCatalogData &
	SubscriptionWithoutRatePlans;

/**
 * this takes a basic zuora subscription and converts it to a guardian "product catalog"
 * inspired structure.
 *
 * This makes it easier to navigate in a guardian context and easier to cross reference
 * with the product catalog.
 *
 * It is designed so that if you switch/assert on the productKey (and/or productRatePlanKey)
 * it will narrow the type so you can access the charges by name and get the right types
 * for the product and productRatePlan.
 *
 * GuardianSubscription
 * ├─ ...(other ZuoraSubscription fields)...
 * │
 * ├─ ratePlans: GuardianRatePlan[]  (includes subscriptions in the product catalog)
 * │  ├─ [0] First rate plan
 * │  │  ├─ productKey: ProductKey;
 * │  │  ├─ productRatePlanKey: AnyProductRatePlanKey;
 * │  │  ├─ product: Product<typeof productKey>
 * │  │  ├─ productRatePlan: ProductRatePlan
 * │  │  ├─ ...(other Zuora rate plan fields)...
 * │  │  └─ ratePlanCharges
 * │  │     ├─ Subscription: RatePlanCharge
 * │  │     │  ├─ productRatePlanCharge: (from product-catalog)
 * │  │     │  └─ ...(usual Zuora rate plan charge fields)...
 * │  │     └─ Contribution: RatePlanCharge
 * │  │        ├─ productRatePlanCharge: (from product-catalog)
 * │  │        └─ ...(usual Zuora rate plan charge fields)...
 * │  │
 * │  ├─ [1] Next rate plan (if any)
 * │  │  ├─ ...(other Zuora rate plan fields)...
 * │  │  └─ ratePlanCharges
 * │  │     ├─ Subscription: RatePlanCharge
 * │  │     │  ├─ productRatePlanCharge: (from product-catalog)
 * │  │     │  └─ ...(usual Zuora rate plan charge fields)...
 * │  │     └─ Contribution: RatePlanCharge
 * │  │        ├─ productRatePlanCharge: (from product-catalog)
 * │  │        └─ ...(usual Zuora rate plan charge fields)...
 * │  │
 * │  └─ ...(other rate plans in subscription)...
 * │
 * └─ productsNotInCatalog: ZuoraRatePlan[]    (includes discounts and other non product catalog)
 *    └─ [0] First non product-catalog rate plan
 *       ├─ product: CatalogProduct
 *       │  ├─ ...(other Zuora catalog product fields)...
 *       │  └─ name: string e.g 'Discounts'
 *       ├─ productRatePlan: ZuoraProductRatePlan
 *       │  ├─ ...(other Zuora catalog product rate plan fields)...
 *       │  └─ name: string e.g 'Cancellation Save Discount - 25% off for 3 months'
 *       ├─ ...(other Zuora rate plan fields)...
 *       └─ ratePlanCharges
 *          └─ ['25% discount on subscription for 3 months']: RatePlanCharge
 *             ├─ productRatePlanCharge: (from zuora-catalog)
 *             └─ ...(usual Zuora rate plan charge fields)...
 *
 * It maintains all current and historical plans and charges.
 *
 * Generally we only have one active rateplan per subscription, so use SubscriptionFilter
 * to filter down to only non-removed/non-ended charges.
 */
export class GuardianSubscriptionParser {
	private zuoraProductIdGuardianLookup: ZuoraProductIdMap;
	constructor(
		catalog: ZuoraCatalog,
		private productCatalog: ProductCatalog,
	) {
		this.zuoraProductIdGuardianLookup = buildZuoraProductIdToKey(catalog);
	}

	/**
	 * attach all subscription and catalog products together and process the combination, merging the results
	 */
	toGuardianSubscription(
		zuoraSubscription: ZuoraSubscription,
	): GuardianSubscriptionMultiPlan {
		const { products, ...subscriptionWithoutRatePlans } =
			groupSubscriptionByIds(zuoraSubscription);

		// we join and then flatten both the product and rateplan levels to avoid undue nesting
		const guardianRatePlans: RatePlansWithCatalogData = joinFlatMap(
			products,
			this.zuoraProductIdGuardianLookup,
			(ratePlansById, { zuoraProduct, productRatePlans }) =>
				joinFlatMap(
					ratePlansById,
					productRatePlans,
					(ratePlansForId, productRatePlanAndChargesMap) =>
						this.buildRatePlansWithCatalogData(
							ratePlansForId,
							productRatePlanAndChargesMap,
							zuoraProduct,
						),
				),
		);

		return {
			...subscriptionWithoutRatePlans,
			...guardianRatePlans,
		};
	}

	/**
	 * for a rate plan that is under a given product, check if the product is known by the product-catalog.
	 *
	 * If so then add it to the ratePlans otherwise to the productsNotInCatalog.
	 */
	private buildRatePlansWithCatalogData(
		subscriptionRatePlansForProductRatePlan: readonly ZuoraRatePlanWithIndexedCharges[],
		productRatePlanNode: ZuoraProductRatePlanNode,
		product: CatalogProduct,
	): RatePlansWithCatalogData {
		const maybeGuardianKeys = this.getGuardianKeys(
			product.name,
			productRatePlanNode.zuoraProductRatePlan.name,
		);

		if (maybeGuardianKeys === undefined) {
			// not in product catalog - attach to zuora catalog instead
			const zuoraRatePlanBuilder = new ZuoraRatePlanBuilder(
				product,
				productRatePlanNode,
			);
			return {
				ratePlans: [],
				productsNotInCatalog: zuoraRatePlanBuilder.buildZuoraRatePlans(
					subscriptionRatePlansForProductRatePlan,
				),
			};
		}

		const guardianRatePlanBuilder = new GuardianRatePlanBuilder(
			this.productCatalog,
			productRatePlanNode.productRatePlanCharges,
			maybeGuardianKeys.productKey,
			maybeGuardianKeys.productRatePlanKey,
		);
		const ratePlans = guardianRatePlanBuilder.buildGuardianRatePlans(
			subscriptionRatePlansForProductRatePlan,
		);
		return {
			ratePlans,
			productsNotInCatalog: [],
		};
	}

	private getGuardianKeys(
		zuoraProductName: string,
		zuoraProductRatePlanName: string,
	): GuardianCatalogKeys | undefined {
		const pch = new ProductCatalogHelper(this.productCatalog);
		const productKey: ProductKey | undefined =
			zuoraCatalogToProductKey[zuoraProductName];
		const productRatePlanKey: string | undefined =
			zuoraCatalogToProductRatePlanKey[zuoraProductRatePlanName];
		return productKey !== undefined && productRatePlanKey !== undefined
			? pch.validate(productKey, productRatePlanKey)
			: undefined;
	}
}

/**
 * attaches a subscription rate plan id to a catalog id, and flattens out the
 * resulting lists
 */
function joinFlatMap<K, S, C>(
	subLookup: Map<K, S>,
	catLookup: Map<K, C>,
	mapFn: (sub: S, cat: C) => RatePlansWithCatalogData,
) {
	return joinAllLeft(subLookup, catLookup)
		.map(([sub, cat]: [S, C, K]) => mapFn(sub, cat))
		.reduce((rp1, rp2) => ({
			ratePlans: [...rp1.ratePlans, ...rp2.ratePlans],
			productsNotInCatalog: [
				...rp1.productsNotInCatalog,
				...rp2.productsNotInCatalog,
			],
		}));
}
