import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type { ZuoraSubscription } from '@modules/zuora/types';
import type {
	ProductId,
	ProductRatePlanId,
	ZuoraCatalog,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import type { ZuoraProductIdMap } from './group/buildZuoraProductIdToKey';
import { buildZuoraProductIdToKey } from './group/buildZuoraProductIdToKey';
import { byProductAndRatePlanIds } from './group/byProductAndRatePlanIds';
import type { SubscriptionWithoutRatePlans } from './group/groupSubscriptionByZuoraCatalogIds';
import type { RatePlansBeforeCharges } from './joinProductsAndRatePlans';
import { joinProductsAndRatePlans } from './joinProductsAndRatePlans';
import type {
	MmaGuardianSubscriptionMultiPlan,
	MmaZuoraSubscription,
} from './mma/mmaSubscriptionTypes';
import type { GuardianRatePlanMap } from './reprocessRatePlans/guardianRatePlanBuilder';
import { indexAndJoinGuardianRatePlanCharges } from './reprocessRatePlans/guardianRatePlanBuilder';
import type { ZuoraRatePlan } from './reprocessRatePlans/zuoraRatePlanBuilder';
import { indexAndJoinZuoraRatePlanCharges } from './reprocessRatePlans/zuoraRatePlanBuilder';

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
		const { ratePlans, ...subscriptionWithoutRatePlans } = zuoraSubscription;
		const { ratePlans: guardianRatePlans, productsNotInCatalog } =
			this.groupAndJoinProductsAndRatePlans(ratePlans);

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
		zuoraSubscription: MmaZuoraSubscription,
	): MmaGuardianSubscriptionMultiPlan {
		const { ratePlans, ...subscriptionWithoutRatePlans } = zuoraSubscription;
		return {
			...subscriptionWithoutRatePlans,
			...this.groupAndJoinProductsAndRatePlans(ratePlans),
		};
	}

	/**
	 * the shared "join the products and rate plans" pass: group the subscription
	 * rate plans by product*Id and join them to the catalog.
	 *
	 * The grouping never indexes the charges, so this is generic over the rate
	 * plan type and works for both the full and MMA subscriptions.
	 */
	private groupAndJoinProductsAndRatePlans<
		SubRP extends {
			productId: ProductId;
			productRatePlanId: ProductRatePlanId;
		},
	>(ratePlans: SubRP[]): RatePlansBeforeCharges<SubRP> {
		return joinProductsAndRatePlans(
			byProductAndRatePlanIds(ratePlans),
			this.zuoraProductIdGuardianLookup,
			this.productCatalog,
		);
	}
}
