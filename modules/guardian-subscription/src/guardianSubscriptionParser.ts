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
import type {
	RatePlanOnly,
	SubscriptionWithRatePlansOnly,
} from '@modules/zuora/objectQuery/expandSchemas/subscriptionItemSchema';
import type { ZuoraSubscription } from '@modules/zuora/types';
import type {
	CatalogProduct,
	ProductId,
	ProductRatePlanId,
	ZuoraCatalog,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import type {
	ZuoraProductIdMap,
	ZuoraProductRatePlanNode,
} from './group/buildZuoraProductIdToKey';
import { buildZuoraProductIdToKey } from './group/buildZuoraProductIdToKey';
import { groupSubscriptionByProductAndRatePlanIds } from './group/groupSubscriptionByZuoraCatalogIds';
import type {
	GuardianRatePlanBeforeCharges,
	GuardianRatePlanMap,
} from './reprocessRatePlans/guardianRatePlanBuilder';
import {
	GuardianRatePlanBuilder,
	indexAndJoinGuardianRatePlanCharges,
} from './reprocessRatePlans/guardianRatePlanBuilder';
import type {
	ZuoraRatePlan,
	ZuoraRatePlanBeforeCharges,
} from './reprocessRatePlans/zuoraRatePlanBuilder';
import {
	indexAndJoinZuoraRatePlanCharges,
	ZuoraRatePlanBuilder,
} from './reprocessRatePlans/zuoraRatePlanBuilder';

/**
 * This represents what extra info we attach to the subscription to make a "guardian" subscription.
 */
type RatePlansWithCatalogData = {
	ratePlans: GuardianRatePlanMap[];
	productsNotInCatalog: ZuoraRatePlan[]; // slightly different type needed with zuora catalog attached
};

type SubscriptionWithoutRatePlans = Omit<ZuoraSubscription, 'ratePlans'>;
/**
 * represents a zuora subscription that has been augmented with guardian and zuora catalog information
 */
export type GuardianSubscriptionMultiPlan = RatePlansWithCatalogData &
	SubscriptionWithoutRatePlans;

/**
 * The rate plans of a subscription after the products and rate plans have been
 * joined to the catalog, but before the charges have been joined.
 *
 * - ratePlans: known product-catalog plans (all amendment types retained)
 * - productsNotInCatalog: unknown plans (e.g. Discounts)
 *
 * Both buckets carry the catalog charge lookup (productCatalogCharges) so the
 * charges can be joined later (full path) or left unused (MMA path).
 */
export type RatePlansBeforeCharges<SubRP> = {
	ratePlans: Array<GuardianRatePlanBeforeCharges<SubRP>>;
	productsNotInCatalog: Array<ZuoraRatePlanBeforeCharges<SubRP>>;
};

type MmaSubscriptionWithoutRatePlans = Omit<
	SubscriptionWithRatePlansOnly,
	'ratePlans'
>;

export type MmaGuardianSubscriptionMultiPlan =
	RatePlansBeforeCharges<RatePlanOnly> & MmaSubscriptionWithoutRatePlans;

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
		const {
			ratePlans: guardianRatePlans,
			productsNotInCatalog,
			...subscriptionWithoutRatePlans
		} = this.toGuardianRatePlans(zuoraSubscription);
		// now we have the subscription charges, index them and join them onto each rate plan
		return {
			...subscriptionWithoutRatePlans,
			ratePlans: guardianRatePlans.map(indexAndJoinGuardianRatePlanCharges),
			productsNotInCatalog: productsNotInCatalog.map(
				indexAndJoinZuoraRatePlanCharges,
			),
		};
	}

	/**
	 * the MMA/object-query equivalent of toGuardianSubscription.
	 *
	 * It shares the "join the products and rate plans" pass, but the object-query
	 * expand has no charges, so it stops there and never runs the "join the
	 * charges" pass. The carried catalog charge lookups stay attached and unused,
	 * ready for later if/when we do fetch the charges.
	 */
	toMmaGuardianSubscription(
		zuoraSubscription: SubscriptionWithRatePlansOnly,
	): MmaGuardianSubscriptionMultiPlan {
		return this.toGuardianRatePlans(zuoraSubscription);
	}

	/**
	 * the shared "join the products and rate plans" pass: group the subscription
	 * rate plans by product*Id and join them to the catalog.
	 *
	 * The grouping never indexes the charges, so this is generic over the rate
	 * plan type and works for both the full and MMA subscriptions.
	 */
	private toGuardianRatePlans<
		SubRP extends {
			productId: ProductId;
			productRatePlanId: ProductRatePlanId;
		},
		S extends { ratePlans: SubRP[] },
	>(
		zuoraSubscription: S,
	): Omit<S, 'ratePlans'> & RatePlansBeforeCharges<S['ratePlans'][number]> {
		const { ratePlans, ...subscriptionWithoutRatePlans } = zuoraSubscription;
		const products = groupSubscriptionByProductAndRatePlanIds(ratePlans);

		// we join and then flatten both the product and rateplan levels to avoid undue nesting
		const guardianRatePlans: RatePlansBeforeCharges<SubRP> = joinFlatMap(
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
	 * for a rate plan that is under a given product, check if the product is known
	 * by the product-catalog.
	 *
	 * If so then attach the catalog product/rateplan/keys (ratePlans), otherwise
	 * attach the basic zuora catalog product/rateplan (productsNotInCatalog).
	 */
	private buildRatePlansWithCatalogData<SubRP>(
		subscriptionRatePlansForProductRatePlan: readonly SubRP[],
		productRatePlanNode: ZuoraProductRatePlanNode,
		product: CatalogProduct,
	): RatePlansBeforeCharges<SubRP> {
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

type PartitionedRatePlansByCatalog<RP, NIC> = {
	ratePlans: RP[];
	productsNotInCatalog: NIC[];
};

/**
 * Joins two maps by key, applies mapFn to each matched pair, then flattens
 * the resulting ratePlans and productsNotInCatalog arrays.
 *
 * Used in guardianSubscriptionParser.ts (via joinProductsAndRatePlans) to join
 * to join subscription rate plans against catalog entries at both the product
 * and rate-plan levels.
 */
function joinFlatMap<K, S, C, RP, NIC>(
	subLookup: Map<K, S>,
	catLookup: Map<K, C>,
	mapFn: (sub: S, cat: C) => PartitionedRatePlansByCatalog<RP, NIC>,
): PartitionedRatePlansByCatalog<RP, NIC> {
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
