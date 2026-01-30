import {
	groupCollectByUniqueId,
	partitionByType,
} from '@modules/arrayFunctions';
import { getIfDefined, mapOption } from '@modules/nullAndUndefined';
import { objectJoinBijective, objectLeftJoin } from '@modules/objectFunctions';
import type {
	GuardianCatalogKeys,
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
} from './buildZuoraProductIdToKey';
import { buildZuoraProductIdToKey } from './buildZuoraProductIdToKey';
import type { GuardianSubscription } from './getSinglePlanFlattenedSubscriptionOrThrow';
import type {
	IndexedZuoraRatePlanWithCharges,
	IndexedZuoraSubscriptionRatePlanCharges,
	IndexedZuoraSubscriptionRatePlans,
	RestRatePlan,
	RestRatePlanCharge,
	RestSubscription,
} from './groupSubscriptionByZuoraCatalogIds';
import { ZuoraSubscriptionIndexer } from './groupSubscriptionByZuoraCatalogIds';

// export type GuardianCatalogRatePlanValies<
// 	P extends ProductKey = ProductKey,
// 	PRP extends ProductRatePlanKey<P> = ProductRatePlanKey<P>,
// > = {
// 	productRatePlanKey: PRP;
// 	productRatePlan: Omit<ProductRatePlan<P, PRP>, 'charges'>;
// 	ratePlanCharges: Record<ProductRatePlanChargeKey<P, PRP>, RestRatePlanCharge>;
// };

/**
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

type ZuoraCatalogValues = {
	product: Omit<CatalogProduct, 'productRatePlans'>;
	productRatePlan: Omit<ZuoraProductRatePlan, 'productRatePlanCharges'>;
	ratePlanCharges: Record<string, ZuoraRatePlanCharge>; // index by zuora charge name
};

export type GuardianRatePlans<P extends ProductKey = ProductKey> = Record<
	string,
	Array<GuardianRatePlan<P>>
>;

// rateplan

export type GenericRatePlan<
	RPCAT extends { ratePlanCharges: Record<string, RestRatePlanCharge> } = {
		ratePlanCharges: Record<string, RestRatePlanCharge>;
	},
> = RestRatePlan & RPCAT;

export type GuardianRatePlan<P extends ProductKey = ProductKey> =
	GenericRatePlan<GuardianCatalogValues<P>>;

export type ZuoraRatePlan = GenericRatePlan<ZuoraCatalogValues>;

// charges

export type GenericRatePlanCharges<
	K extends string,
	RPC extends RestRatePlanCharge,
> = Record<K, RPC>;
//
// export type GuardianRatePlanCharges =
// 	GenericRatePlanCharges<undefined>;
//
// type GuardianRatePlanCharges = Record<
// 	string /*FIXME CHKEY for P*/,
// 	RestRatePlanCharge
// >;
//
// type ZuoraRatePlanCharges = Record<string, ZuoraRatePlanCharge>;

// charge

type ZuoraRatePlanCharge = RestRatePlanCharge & {
	productRatePlanCharge: ZuoraProductRatePlanCharge;
};

//

export type GuardianSubscriptionProducts = {
	[K in ProductKey]?: GuardianRatePlans<K>;
};

type RatePlansWithCatalogData<P extends ProductKey = ProductKey> = {
	ratePlans: Array<GuardianRatePlan<P>>;
	productsNotInCatalog: ZuoraRatePlan[]; // slightly different type needed with zuora catalog attached
};

export type GroupedGuardianSubscription = RatePlansWithCatalogData &
	RestSubscription;

function joinAllLeft<K extends string, VA, VB, KR extends K>(
	l: Record<K, VA>,
	r: Record<KR, VB>,
) {
	const [inZuoraCatalog, errors] = partitionByType(
		objectLeftJoin(
			// attaches any products not in the (filtered) catalog to `undefined`
			l,
			r,
		),
		(pair): pair is [VA, VB] => pair[1] !== undefined,
	);
	if (errors.length > 0) {
		throw new Error(
			`subscription had an id that was missing from the zuora catalog ${errors.length}: ` +
				JSON.stringify(errors),
		);
	}
	return inZuoraCatalog;
}

/**
 * this takes a basic zuora subscription and converts it to a guardian "product catalog"
 * like structure
 *
 * This makes it easier to navigate in a guardian context and easier to cross reference
 * with the product catalog.
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
 *       │  └─ name: string e.g 'Discounts'
 *       ├─ productRatePlan: ZuoraProductRatePlan
 *       │  └─ name: string e.g 'Cancellation Save Discount - 25% off for 3 months'
 *       ├─ ...(other Zuora rate plan fields)...
 *       └─ ratePlanCharges
 *          └─ ['25% discount on subscription for 3 months']: RatePlanCharge
 *             ├─ productRatePlanCharge: (from zuora-catalog)
 *             └─ ...(usual Zuora rate plan charge fields)...
 *
 * It maintains all current and historical plans and charges.
 */
export class GuardianSubscriptionParser {
	private zuoraProductIdGuardianLookup: ZuoraProductIdMap;
	constructor(
		catalog: ZuoraCatalog,
		private productCatalog: ProductCatalog,
	) {
		this.zuoraProductIdGuardianLookup = buildZuoraProductIdToKey(catalog);
	}

	parse(zuoraSubscription: ZuoraSubscription): GroupedGuardianSubscription {
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

	buildGuardianRatePlansByProductKey(
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

	buildRatePlansWithCatalogData(
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

	private buildGuardianRatePlans<P extends ProductKey>(
		productKey: P,
		productRatePlanKey: ProductRatePlanKey<P>,
		productRatePlanNode: ZuoraProductRatePlanNode,
		subscriptionRatePlansForProductRatePlan: readonly IndexedZuoraRatePlanWithCharges[],
	): Array<GuardianRatePlan<P>> {
		const productCatalogHelper = new ProductCatalogHelper(this.productCatalog);
		const validKeys: GuardianCatalogKeys<P> =
			productCatalogHelper.validateOrThrow(productKey, productRatePlanKey); // just in case of coding discrepancy
		const product: Product<typeof productKey> = this.productCatalog[productKey];
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- just discarded an omitted variable
		const { ratePlans: _unused1, ...restProduct } = product;
		const productRatePlan = productCatalogHelper.getProductRatePlan(
			productKey,
			productRatePlanKey,
		);

		if (
			typeof productRatePlan !== 'object' ||
			productRatePlan === null ||
			!('charges' in productRatePlan)
		) {
			throw new Error(
				"productRatePlan doesn't have charges in product catalog - coding error",
			);
		}
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- discard an omitted variable
		const { charges: _unused2, ...restProductRatePlan } = productRatePlan;
		const keys = (
			ratePlanCharges: Record<
				ProductRatePlanChargeKey<P, typeof validKeys.productRatePlanKey>,
				RestRatePlanCharge
			>,
		): GuardianCatalogValues<typeof productKey> => {
			const catalogValues = {
				productKey: validKeys.productKey,
				product: restProduct,
				productRatePlanKey: validKeys.productRatePlanKey,
				productRatePlan: restProductRatePlan,
				ratePlanCharges: ratePlanCharges,
			};
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- not sure what to do here!
			return catalogValues as GuardianCatalogValues<typeof productKey>;
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
 * @param product
 * @param productRatePlanNode
 * @param subscriptionRatePlansForProductRatePlan
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

// @ts-expect-error -- this is to ensure type narrowing isn't broken
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- this is to ensure type narrowing isn't broken
function shouldCompile(subscription: GuardianSubscription) {
	const ratePlan = subscription.ratePlan;
	if (
		ratePlan.productKey === 'SupporterPlus' &&
		ratePlan.productRatePlanKey === 'OneYearStudent'
	) {
		const a = ratePlan.product.customerFacingName;
		const b = ratePlan.productRatePlan.pricing.NZD;
		const c = ratePlan.ratePlanCharges.Subscription.price;
		return { a, b, c };
	}

	if (
		ratePlan.productKey === 'SupporterPlus' &&
		(ratePlan.productRatePlanKey === 'Monthly' ||
			ratePlan.productRatePlanKey === 'Annual')
	) {
		const d = ratePlan.product.customerFacingName;
		const e = ratePlan.productRatePlan.pricing.AUD;
		const f = ratePlan.ratePlanCharges.Contribution.price;
		return { d, e, f };
	}
}
