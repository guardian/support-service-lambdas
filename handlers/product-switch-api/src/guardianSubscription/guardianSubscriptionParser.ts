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
import type {
	IndexedZuoraRatePlanWithCharges,
	IndexedZuoraSubscriptionRatePlanCharges,
	IndexedZuoraSubscriptionRatePlans,
	RestRatePlan,
	RestRatePlanCharge,
	RestSubscription,
} from './groupSubscriptionByZuoraCatalogIds';
import { ZuoraSubscriptionIndexer } from './groupSubscriptionByZuoraCatalogIds';

type AnyProductRatePlanCharge = { id: string }; // hard to infer from the product catalog schema/type

type GuardianCatalogValues<P extends ProductKey = ProductKey> = {
	product: Omit<Product<P>, 'ratePlans'>;
	productRatePlan: Omit<ProductRatePlan<P, ProductRatePlanKey<P>>, 'charges'>;
};

export type GuardianRatePlans<P extends ProductKey = ProductKey> = Record<
	string,
	Array<GuardianRatePlan<P>>
>;

// rateplan

export type GenericRatePlan<RPCAT, RPC> = {
	ratePlanCharges: GenericRatePlanCharges<RPC>;
} & RestRatePlan &
	RPCAT;

export type GuardianRatePlan<P extends ProductKey = ProductKey> =
	GenericRatePlan<
		GuardianCatalogKeys<P> & GuardianCatalogValues<P>,
		AnyProductRatePlanCharge
	>;

export type ZuoraRatePlan = GenericRatePlan<
	{
		product: Omit<CatalogProduct, 'productRatePlans'>;
		productRatePlan: Omit<ZuoraProductRatePlan, 'productRatePlanCharges'>;
	},
	ZuoraProductRatePlanCharge
>;

// charges

export type GenericRatePlanCharges<RPC> = Record<
	string,
	GenericRatePlanCharge<RPC>
>;

export type GuardianRatePlanCharges =
	GenericRatePlanCharges<AnyProductRatePlanCharge>;

// charge

type GenericRatePlanCharge<RPC> = RestRatePlanCharge & {
	productRatePlanCharge: RPC;
};

export type GuardianRatePlanCharge =
	GenericRatePlanCharge<AnyProductRatePlanCharge>;

export type ZuoraRatePlanCharge =
	GenericRatePlanCharge<ZuoraProductRatePlanCharge>;

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
	const productsNotInCatalog: ZuoraRatePlan[] = new RatePlansBuilder(
		productRatePlanNode.productRatePlanCharges,
		{
			product: restProduct,
			productRatePlan: restProductRatePlan,
		},
		(c) => [c.name, c],
	).buildGenericRatePlans(subscriptionRatePlansForProductRatePlan);
	return productsNotInCatalog;
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
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- just discarded an unused variable
		const { ratePlans: _unused, ...restProduct } = product;
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
		const { charges, ...restProductRatePlan } = productRatePlan;
		const keys: GuardianCatalogKeys<typeof productKey> &
			GuardianCatalogValues<typeof productKey> = {
			...validKeys,
			product: restProduct,
			productRatePlan: restProductRatePlan,
		};
		const guardianRatePlans: Array<GuardianRatePlan<P>> = new RatePlansBuilder(
			productRatePlanNode.productRatePlanCharges,
			keys,
			(zuoraProductRatePlanCharge) => {
				const chargeKey = getIfDefined(
					zuoraCatalogToProductRatePlanChargeKey[
						zuoraProductRatePlanCharge.name
					],
					'some charges of this product are missing from the product-catalog keys lookup',
				);
				return [
					chargeKey,
					getIfDefined(
						// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- ts can't handle its own AnyProductRatePlanCharge
						(charges as Record<string, AnyProductRatePlanCharge>)[chargeKey],
						`missing charge key ${chargeKey} from product-catalog`,
					),
				];
			},
		).buildGenericRatePlans(subscriptionRatePlansForProductRatePlan);
		return guardianRatePlans;
	}
}
class RatePlansBuilder<RP, RPC> {
	constructor(
		private productRatePlanCharges: ZuoraProductRatePlanChargeIdMap,
		private ratePlanExtra: RP,
		private toRPC: (c: ZuoraProductRatePlanCharge) => [string, RPC],
	) {}

	buildGenericRatePlans(
		zuoraSubscriptionRatePlans: readonly IndexedZuoraRatePlanWithCharges[],
	): Array<GenericRatePlan<RP, RPC>> {
		return zuoraSubscriptionRatePlans.map(
			(zuoraSubscriptionRatePlan: IndexedZuoraRatePlanWithCharges) => {
				return this.buildGuardianRatePlan(zuoraSubscriptionRatePlan);
			},
		);
	}

	buildGuardianRatePlan(
		zuoraSubscriptionRatePlan: IndexedZuoraRatePlanWithCharges,
	): GenericRatePlan<RP, RPC> {
		const { ratePlanCharges, ...rest } = zuoraSubscriptionRatePlan;

		return {
			...rest,
			ratePlanCharges: this.buildGuardianRatePlanCharges(ratePlanCharges),
			...this.ratePlanExtra,
		};
	}

	private buildGuardianRatePlanCharges(
		zuoraSubscriptionRatePlanCharges: IndexedZuoraSubscriptionRatePlanCharges,
	): GenericRatePlanCharges<RPC> {
		return groupCollectByUniqueId(
			objectJoinBijective(
				this.productRatePlanCharges,
				zuoraSubscriptionRatePlanCharges,
			),
			([zuoraProductRatePlanCharge, subCharge]) => {
				const [key, catalogCharge] = this.toRPC(zuoraProductRatePlanCharge);
				return [
					key,
					{
						...subCharge,
						productRatePlanCharge: catalogCharge,
					} satisfies RestRatePlanCharge & {
						productRatePlanCharge: RPC;
					},
				];
			},
			'duplicate rate plan charge keys',
		);
	}
}
