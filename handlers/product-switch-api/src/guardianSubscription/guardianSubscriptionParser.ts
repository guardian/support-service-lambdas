import { groupCollectByUniqueId } from '@modules/arrayFunctions';
import { getIfDefined, mapOption } from '@modules/nullAndUndefined';
import { joinAllLeft, objectJoinBijective } from '@modules/objectFunctions';
import type {
	Product,
	ProductCatalog,
	ProductKey,
	ProductRatePlan,
	ProductRatePlanChargeKey,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import {
	zuoraCatalogToProductKey,
	zuoraCatalogToProductRatePlanChargeKey,
	zuoraCatalogToProductRatePlanKey,
} from '@modules/product-catalog/zuoraToProductNameMappings';
import type { ZuoraSubscription } from '@modules/zuora/types';
import type {
	CatalogProduct,
	ZuoraCatalog,
	ZuoraProductRatePlan,
	ZuoraProductRatePlanCharge,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import type {
	ZuoraProductIdMap,
	ZuoraProductNode,
	ZuoraProductRatePlanChargeIdMap,
	ZuoraProductRatePlanNode,
} from './group/buildZuoraProductIdToKey';
import { buildZuoraProductIdToKey } from './group/buildZuoraProductIdToKey';
import type {
	IndexedZuoraRatePlanWithCharges,
	IndexedZuoraSubscriptionRatePlanCharges,
	IndexedZuoraSubscriptionRatePlans,
	RestRatePlan,
	RestRatePlanCharge,
	RestSubscription,
} from './group/groupSubscriptionByZuoraCatalogIds';
import { ZuoraSubscriptionIndexer } from './group/groupSubscriptionByZuoraCatalogIds';

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
	parse(zuoraSubscription: ZuoraSubscription): GuardianSubscriptionMultiPlan {
		const { products, ...restSubscription } =
			ZuoraSubscriptionIndexer.byProductIds.groupSubscription(
				zuoraSubscription,
			);

		const { ratePlans, productsNotInCatalog } = joinAllLeft(
			products,
			this.zuoraProductIdGuardianLookup,
		)
			.map(([sub, cat]) => this.buildGuardianRatePlansByProductKey(sub, cat))
			.reduce((rp1, rp2) => ({
				ratePlans: [...rp1.ratePlans, ...rp2.ratePlans],
				productsNotInCatalog: [
					...rp1.productsNotInCatalog,
					...rp2.productsNotInCatalog,
				],
			}));

		return {
			...restSubscription,
			ratePlans,
			productsNotInCatalog,
		};
	}

	/**
	 * looking at a specific productId, join the rate plans underneath, process the list, and then merge all the results
	 */
	private buildGuardianRatePlansByProductKey(
		zuoraSubscriptionRatePlans: IndexedZuoraSubscriptionRatePlans,
		productNode: ZuoraProductNode,
	): RatePlansWithCatalogData {
		return joinAllLeft(zuoraSubscriptionRatePlans, productNode.productRatePlans)
			.map(([sub, cat]) =>
				this.buildRatePlansWithCatalogData(sub, cat, productNode.zuoraProduct),
			)
			.reduce((rp1, rp2) => ({
				ratePlans: [...rp1.ratePlans, ...rp2.ratePlans],
				productsNotInCatalog: [
					...rp1.productsNotInCatalog,
					...rp2.productsNotInCatalog,
				],
			}));
	}

	/**
	 * for a rate plan that is under a given product, check if the product is known by the product-catalog.
	 *
	 * If so then add it to the ratePlans otherwise to the productsNotInCatalog.
	 */
	private buildRatePlansWithCatalogData(
		subscriptionRatePlansForProductRatePlan: readonly IndexedZuoraRatePlanWithCharges[],
		productRatePlanNode: ZuoraProductRatePlanNode,
		product: CatalogProduct,
	): RatePlansWithCatalogData {
		const productKey = zuoraCatalogToProductKey[product.name];
		const maybeRatePlans: GuardianRatePlan[] | undefined = mapOption(
			productKey,
			(productKey) =>
				this.buildRatePlansWithCatalogDataForProductKey(
					productKey,
					productRatePlanNode,
					subscriptionRatePlansForProductRatePlan,
				),
		);
		return (
			mapOption(maybeRatePlans, (ratePlans) => ({
				ratePlans,
				productsNotInCatalog: [],
			})) ?? {
				ratePlans: [],
				productsNotInCatalog: buildZuoraRatePlans(
					product,
					productRatePlanNode,
					subscriptionRatePlansForProductRatePlan,
				),
			}
		);
	}

	/**
	 * given that the product is in the product-catalog, now check the rate plan is also in.
	 *
	 * If so then return it (so it will be added to the ratePlans), otherwise return undefined
	 * (which will cause it to be added the productsNotInCatalog)
	 */
	private buildRatePlansWithCatalogDataForProductKey<P extends ProductKey>(
		productKey: P,
		productRatePlanNode: ZuoraProductRatePlanNode,
		subscriptionRatePlansForProductRatePlan: readonly IndexedZuoraRatePlanWithCharges[],
	): Array<GuardianRatePlan<P>> | undefined {
		const productRatePlanKey =
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- insufficient type for zuoraCatalogToProductRatePlanKey
			zuoraCatalogToProductRatePlanKey[
				productRatePlanNode.zuoraProductRatePlan.name
			] as ProductRatePlanKey<P> | undefined;

		return mapOption(productRatePlanKey, (productRatePlanKey) =>
			this.buildGuardianRatePlans(
				productKey,
				productRatePlanKey,
				productRatePlanNode,
				subscriptionRatePlansForProductRatePlan,
			),
		);
	}

	/**
	 * given that the product and rateplan are in the product catalog, return a modified rate plan object
	 * that contains the product-catalog keys and values, as well as the charges keyed as per the product
	 * catalog.
	 */
	private buildGuardianRatePlans<
		P extends ProductKey,
		PRP extends ProductRatePlanKey<P>,
	>(
		productKey: P,
		productRatePlanKey: PRP,
		productRatePlanNode: ZuoraProductRatePlanNode,
		subscriptionRatePlansForProductRatePlan: readonly IndexedZuoraRatePlanWithCharges[],
	): Array<GuardianRatePlan<P>> {
		const productCatalogHelper = new ProductCatalogHelper(this.productCatalog);
		const product: Product<typeof productKey> = this.productCatalog[productKey];
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- just discarded an omitted variable
		const { ratePlans: _unused1, ...restProduct } = product;
		const productRatePlan = productCatalogHelper.getProductRatePlan(
			productKey,
			productRatePlanKey,
		);

		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- discard an omitted variable
		const { charges: _unused2, ...restProductRatePlan } = productRatePlan;
		const keys = (
			ratePlanCharges: Record<
				ProductRatePlanChargeKey<P, typeof productRatePlanKey>,
				RestRatePlanCharge
			>,
		): GuardianCatalogValues<typeof productKey> => {
			return {
				productKey: productKey,
				product: restProduct,
				productRatePlanKey: productRatePlanKey,
				productRatePlan: restProductRatePlan,
				ratePlanCharges: ratePlanCharges,
			};
		};
		const guardianRatePlans: Array<GuardianRatePlan<P>> = new RatePlansBuilder<
			GuardianCatalogValues<P>,
			ProductRatePlanChargeKey<P, ProductRatePlanKey<P>>,
			RestRatePlanCharge
		>(
			productRatePlanNode.productRatePlanCharges,
			keys,
			(restRatePlanCharge, zuoraProductRatePlanCharge) => {
				const chargeKey: ProductRatePlanChargeKey<
					P,
					ProductRatePlanKey<P>
					// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- missing type from underlying record type
				> = getIfDefined(
					zuoraCatalogToProductRatePlanChargeKey[
						zuoraProductRatePlanCharge.name
					],
					'some charges of this product are missing from the product-catalog keys lookup',
				) as ProductRatePlanChargeKey<P, ProductRatePlanKey<P>>;
				return [chargeKey, restRatePlanCharge];
			},
		).buildGenericRatePlans(subscriptionRatePlansForProductRatePlan);
		return guardianRatePlans;
	}
}

/**
 * if it's not a product catalog product, we build a basic ZuoraRatePlan instead
 *
 * This is mostly useful for Discounts, but there will be other products not represented.
 */
function buildZuoraRatePlans(
	product: CatalogProduct,
	productRatePlanNode: ZuoraProductRatePlanNode,
	subscriptionRatePlansForProductRatePlan: readonly IndexedZuoraRatePlanWithCharges[],
): ZuoraRatePlan[] {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- throw away children
	const { productRatePlans: _discard1, ...restProduct } = product;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- throw away children
	const { productRatePlanCharges: _discard2, ...restProductRatePlan } =
		productRatePlanNode.zuoraProductRatePlan;

	// build a zuora-catalog rateplan
	const productsNotInCatalog: ZuoraRatePlan[] = new RatePlansBuilder<
		ZuoraCatalogValues,
		string,
		ZuoraRatePlanCharge
	>(
		productRatePlanNode.productRatePlanCharges,
		(ratePlanCharges) =>
			({
				product: restProduct,
				productRatePlan: restProductRatePlan,
				ratePlanCharges,
			}) satisfies ZuoraCatalogValues,
		(
			restRatePlanCharge: RestRatePlanCharge,
			productRatePlanCharge: ZuoraProductRatePlanCharge,
		) => [
			productRatePlanCharge.name,
			{
				...restRatePlanCharge,
				productRatePlanCharge,
			} satisfies ZuoraRatePlanCharge,
		],
	).buildGenericRatePlans(subscriptionRatePlansForProductRatePlan);
	return productsNotInCatalog;
}

/**
 * this class handles reprocessing a rate plan and its charges to remove the standard charges field
 * and replace with appropriate catalog specific fields.
 */
class RatePlansBuilder<
	RP extends { ratePlanCharges: Record<string, RestRatePlanCharge> },
	K extends string,
	RPC,
> {
	constructor(
		private productRatePlanCharges: ZuoraProductRatePlanChargeIdMap,
		private ratePlanExtra: (r: Record<K, RPC>) => RP,
		private toRPC: (
			s: RestRatePlanCharge,
			c: ZuoraProductRatePlanCharge,
		) => [K, RPC],
	) {}

	buildGenericRatePlans(
		zuoraSubscriptionRatePlans: readonly IndexedZuoraRatePlanWithCharges[],
	): Array<GenericRatePlan<RP>> {
		return zuoraSubscriptionRatePlans.map(
			(zuoraSubscriptionRatePlan: IndexedZuoraRatePlanWithCharges) => {
				return this.buildGuardianRatePlan(zuoraSubscriptionRatePlan);
			},
		);
	}

	buildGuardianRatePlan(
		zuoraSubscriptionRatePlan: IndexedZuoraRatePlanWithCharges,
	): GenericRatePlan<RP> {
		const { ratePlanCharges, ...rest } = zuoraSubscriptionRatePlan;

		return {
			...rest,
			...this.ratePlanExtra(this.buildGuardianRatePlanCharges(ratePlanCharges)),
		};
	}

	private buildGuardianRatePlanCharges(
		zuoraSubscriptionRatePlanCharges: IndexedZuoraSubscriptionRatePlanCharges,
	): Record<K, RPC> {
		return groupCollectByUniqueId(
			objectJoinBijective(
				this.productRatePlanCharges,
				zuoraSubscriptionRatePlanCharges,
			),
			([zuoraProductRatePlanCharge, subCharge]) => {
				return this.toRPC(subCharge, zuoraProductRatePlanCharge);
			},
			'duplicate rate plan charge keys',
		);
	}
}

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
type GuardianCatalogValues<P extends ProductKey = ProductKey> = {
	[K in P]: {
		[RPK in ProductRatePlanKey<K>]: {
			productKey: K;
			product: Omit<Product<K>, 'ratePlans'>;
			productRatePlanKey: RPK;
			productRatePlan: Omit<ProductRatePlan<K, RPK>, 'charges'>;
			ratePlanCharges: Record<
				ProductRatePlanChargeKey<K, RPK>,
				RestRatePlanCharge
			>;
		};
	}[ProductRatePlanKey<K>];
}[P];

/**
 * this is what we attach to the rate plan in place of zuora's basic rate plans array if it's a non-product-catalog one
 * e.g. Discounts or other non-standard products.
 */
type ZuoraCatalogValues = {
	product: Omit<CatalogProduct, 'productRatePlans'>;
	productRatePlan: Omit<ZuoraProductRatePlan, 'productRatePlanCharges'>;
	ratePlanCharges: Record<string, ZuoraRatePlanCharge>; // index by zuora charge name
};

// rateplan types for a "guardian" subscription

/**
 * EXTRA represents whatever extra info we attach to the rateplan to make a "guardian" rateplan
 */
export type GenericRatePlan<
	EXTRA extends { ratePlanCharges: Record<string, RestRatePlanCharge> } = {
		ratePlanCharges: Record<string, RestRatePlanCharge>;
	},
> = RestRatePlan & EXTRA;

export type GuardianRatePlan<P extends ProductKey = ProductKey> =
	GenericRatePlan<GuardianCatalogValues<P>>;

export type ZuoraRatePlan = GenericRatePlan<ZuoraCatalogValues>;

/**
 * For non-product-catalog charges, we retain the full catalog info
 *
 * (Note: For product-catalog charges, the charge only contains the id so it's not worth keeping)
 */
type ZuoraRatePlanCharge = RestRatePlanCharge & {
	productRatePlanCharge: ZuoraProductRatePlanCharge;
};

/**
 * This represents what extra info we attach to the subscription to make a "guardian" subscription.
 */
type RatePlansWithCatalogData = {
	ratePlans: GuardianRatePlan[];
	productsNotInCatalog: ZuoraRatePlan[]; // slightly different type needed with zuora catalog attached
};

/**
 * represents a zuora subscription that has been augmented with guardian and zuora catalog information
 */
export type GuardianSubscriptionMultiPlan = RatePlansWithCatalogData &
	RestSubscription;
