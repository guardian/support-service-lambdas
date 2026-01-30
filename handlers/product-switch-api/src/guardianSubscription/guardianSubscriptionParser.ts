import {
	groupCollectByUniqueId,
	partitionByType,
} from '@modules/arrayFunctions';
import { getIfDefined } from '@modules/nullAndUndefined';
import { objectJoinBijective, objectLeftJoin } from '@modules/objectFunctions';
import type {
	AnyProductRatePlanKey,
	GuardianCatalogKeys,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import {
	zuoraCatalogToProductKey,
	zuoraCatalogToProductRatePlanChargeKey,
	zuoraCatalogToProductRatePlanKey,
} from '@modules/product-catalog/zuoraToProductNameMappings';
import type { RatePlanCharge, ZuoraSubscription } from '@modules/zuora/types';
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
	RestSubscription,
} from './groupSubscriptionByZuoraCatalogIds';
import { ZuoraSubscriptionIndexer } from './groupSubscriptionByZuoraCatalogIds';

export type GuardianRatePlanCharges = GenericRatePlanCharges<undefined>; //Record<
// 	string, // guardian rate plan charge key e.g. 'Subscription' or 'Saturday' - FIXME use ProductRatePlanChargeKey<P> & string
// 	RatePlanCharge // is technically the zuora charge but we don't need to touch it
// 	// & { productRatePlanCharge: product-catalog charge } TODO
// >;

export type GuardianRatePlan<P extends ProductKey = ProductKey> =
	GenericRatePlan<GuardianCatalogKeys<P>, undefined>;
// {
// 	ratePlanCharges: GuardianRatePlanCharges;
// 	// TODO add product or zuora catalog
// } & RestRatePlan &
// 	GuardianCatalogKeys<P>;

// export type ZuoraRatePlanCharges = Record<
// 	string, // guardian rate plan charge key e.g. 'Subscription' or 'Saturday' - FIXME use ProductRatePlanChargeKey<P> & string
// 	RatePlanCharge & { productRatePlanCharge: ZuoraProductRatePlanCharge } // is technically the zuora charge but we don't need to touch it
// >;

export type GenericRatePlan<RP, RPC> = {
	ratePlanCharges: GenericRatePlanCharges<RPC>;
} & RestRatePlan &
	RP;

export type GenericRatePlanCharges<RPC> = Record<
	string, // guardian rate plan charge key e.g. 'Subscription' or 'Saturday' - FIXME use ProductRatePlanChargeKey<P> & string
	RatePlanCharge & { productRatePlanCharge: RPC } // is technically the zuora charge but we don't need to touch it
>;

export type ZuoraRatePlan = GenericRatePlan<
	{
		product: Omit<CatalogProduct, 'productRatePlans'>;
		productRatePlan: Omit<ZuoraProductRatePlan, 'productRatePlanCharges'>;
	},
	ZuoraProductRatePlanCharge
>;
// {
// 	ratePlanCharges: ZuoraRatePlanCharges;
// 	// TODO add product or zuora catalog
// } & RestRatePlan & {
// 		product: Omit<CatalogProduct, 'productRatePlans'>;
// 		productRatePlan: Omit<ZuoraProductRatePlan, 'productRatePlanCharges'>;
// 	};

export type GuardianRatePlans<P extends ProductKey = ProductKey> = Record<
	string,
	Array<GuardianRatePlan<P>>
>;

export type GuardianSubscriptionProducts = {
	[K in ProductKey]?: GuardianRatePlans<K>;
};

type RatePlansWithCatalogData = {
	ratePlans: GuardianRatePlan[];
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
 * └─ products: GuardianSubscriptionProducts + Discounts
 *    ├─ Contribution: GuardianRatePlans
 *    │  └─ Monthly: GuardianRatePlan[]
 *    │     └─ [0] First (or only, or maybe no) monthly contribution
 *    │        ├─ ...(other Zuora rate plan fields)...
 *    │        └─ ratePlanCharges
 *    │           └─ Contribution: RatePlanCharge
 *    │              └─ ...(usual Zuora rate plan charge fields)...
 *    ├─ SupporterPlus: GuardianRatePlans
 *    │  └─ Monthly: GuardianRatePlan[]
 *    │     └─ [0] First (or only) monthly Supporter Plus
 *    │        ├─ ...(other Zuora rate plan fields)...
 *    │        └─ ratePlanCharges
 *    │           ├─ Subscription: RatePlanCharge
 *    │           │  └─ ...(usual Zuora rate plan charge fields)...
 *    │           └─ Contribution: RatePlanCharge
 *    │              └─ ...(usual Zuora rate plan charge fields)...
 *    └─ ...(other products in subscription)...
 * It maintains all current and historical plans and charges.
 * Note: If a rate plan isn't in the product catalog, it uses the zuora catalog name.
 */
export class GuardianSubscriptionParser {
	private zuoraProductIdGuardianLookup: ZuoraProductIdMap;
	constructor(catalog: ZuoraCatalog) {
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
			.map(([sub, cat]) => buildGuardianRatePlansByProductKey(sub, cat))
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
}

function buildGuardianRatePlansByProductKey(
	zuoraSubscriptionRatePlans: IndexedZuoraSubscriptionRatePlans,
	productNode: ZuoraProductNode,
): RatePlansWithCatalogData {
	return joinAllLeft(zuoraSubscriptionRatePlans, productNode.productRatePlans)
		.map(([sub, cat]) =>
			buildGuardianRatePlansByRatePlanKey(sub, cat, productNode.zuoraProduct),
		)
		.reduce((rp1, rp2) => ({
			ratePlans: [...rp1.ratePlans, ...rp2.ratePlans],
			productsNotInCatalog: [
				...rp1.productsNotInCatalog,
				...rp2.productsNotInCatalog,
			],
		}));
}

function buildGuardianRatePlansByRatePlanKey(
	subscriptionRatePlansForProductRatePlan: readonly IndexedZuoraRatePlanWithCharges[],
	productRatePlanNode: ZuoraProductRatePlanNode,
	product: CatalogProduct,
): RatePlansWithCatalogData {
	const productKey = zuoraCatalogToProductKey[product.name];
	const productRatePlanKey =
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- insufficient type for zuoraCatalogToProductRatePlanKey
		zuoraCatalogToProductRatePlanKey[
			productRatePlanNode.zuoraProductRatePlan.name
		] as AnyProductRatePlanKey | undefined;

	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- throw away children
	const { productRatePlans: _discard1, ...restProduct } = product;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- throw away children
	const { productRatePlanCharges: _discard2, ...restProductRatePlan } =
		productRatePlanNode.zuoraProductRatePlan;

	if (productKey === undefined || productRatePlanKey === undefined) {
		// build a zuora-catalog rateplan
		const productsNotInCatalog: ZuoraRatePlan[] = new RatePlansBuilder(
			productRatePlanNode.productRatePlanCharges,
			{
				product: restProduct,
				productRatePlan: restProductRatePlan,
			},
			(c) => [c.name, c],
		).buildGuardianRatePlans(subscriptionRatePlansForProductRatePlan);
		return {
			ratePlans: [],
			productsNotInCatalog,
		};
	} else {
		// build a product-catalog rateplan
		const keys: GuardianCatalogKeys<ProductKey> = {
			productKey,
			productRatePlanKey,
		};
		const ratePlans: GuardianRatePlan[] = new RatePlansBuilder(
			productRatePlanNode.productRatePlanCharges,
			keys,
			(zuoraProductRatePlanCharge) => [
				getIfDefined(
					zuoraCatalogToProductRatePlanChargeKey[
						zuoraProductRatePlanCharge.name
					],
					'some charges of this product are missing from the product-catalog',
				),
				undefined,
			],
		).buildGuardianRatePlans(subscriptionRatePlansForProductRatePlan);
		return {
			ratePlans,
			productsNotInCatalog: [],
		};
	}
}

class RatePlansBuilder<RP, RPC> {
	constructor(
		private productRatePlanCharges: ZuoraProductRatePlanChargeIdMap,
		private ratePlanExtra: RP,
		private toRPC: (c: ZuoraProductRatePlanCharge) => [string, RPC],
	) {}

	buildGuardianRatePlans(
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
					} satisfies RatePlanCharge & {
						productRatePlanCharge: RPC;
					},
				];
			},
			'duplicate rate plan charge keys',
		);
	}
}
