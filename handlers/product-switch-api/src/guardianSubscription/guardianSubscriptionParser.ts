import {
	groupCollectByUniqueId,
	partitionByType,
} from '@modules/arrayFunctions';
import {
	mapValue,
	objectInnerJoin,
	objectJoinBijective,
	objectLeftJoin,
	objectValues,
} from '@modules/objectFunctions';
import type {
	GuardianCatalogKeys,
	ProductKey,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import type { RatePlanCharge, ZuoraSubscription } from '@modules/zuora/types';
import type { ZuoraCatalog } from '@modules/zuora-catalog/zuoraCatalogSchema';
import type {
	ZuoraProductIdToKey,
	ZuoraProductKeyNode,
	ZuoraProductRatePlanChargeIdToKey,
	ZuoraProductRatePlanKeyNode,
} from './buildZuoraProductIdToKey';
import { buildZuoraProductIdToKey } from './buildZuoraProductIdToKey';
import type {
	IndexedZuoraRatePlanWithCharges,
	IndexedZuoraSubscriptionRatePlanCharges,
	IndexedZuoraSubscriptionRatePlans,
	IndexedZuoraSubscriptionRatePlansByProduct,
	RestRatePlan,
	RestSubscription,
} from './groupSubscriptionByZuoraCatalogIds';
import { ZuoraSubscriptionIndexer } from './groupSubscriptionByZuoraCatalogIds';

export type GuardianRatePlanCharges = Record<
	string, // guardian rate plan charge key e.g. 'Subscription' or 'Saturday' - FIXME use ProductRatePlanChargeKey<P> & string
	RatePlanCharge // is technically the zuora charge but we don't need to touch it
>;

export type GuardianRatePlan<P extends ProductKey = ProductKey> = {
	ratePlanCharges: GuardianRatePlanCharges;
} & RestRatePlan &
	GuardianCatalogKeys<P>;

export type GuardianRatePlans<P extends ProductKey = ProductKey> = Record<
	string,
	Array<GuardianRatePlan<P>>
>;

export type GuardianSubscriptionProducts = {
	[K in ProductKey]?: GuardianRatePlans<K>;
};

type GroupedProducts = {
	products: GuardianSubscriptionProducts;
	productsNotInCatalog: IndexedZuoraSubscriptionRatePlansByProduct;
};

export type GroupedGuardianSubscription = GroupedProducts & RestSubscription;

type GuardianKeyToRatePlans<K extends ProductKey> = {
	[P in K]?: GuardianRatePlans<P>;
};

/**
 * this is a bit like groupMapSingleOrThrow, only it maintains the relationship
 * between the key and value.
 * GuardianSubscriptionProducts
 * @param items
 * @param project
 */
function groupMapSingleOrThrowCorrelated<K extends ProductKey, A, B>(
	items: Array<[A, B]>,
	project: (item: [A, B]) => readonly [K, GuardianRatePlans<K>],
	msg: string,
): GuardianKeyToRatePlans<K> {
	const entries: GuardianKeyToRatePlans<K> = // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- utility function but TODO look again at this
		{} as unknown as GuardianKeyToRatePlans<K>;
	for (const item of items) {
		const result = project(item);
		if (entries[result[0]]) {
			throw new Error(`${msg}: multiple entries for ${result[0]}`);
		}
		entries[result[0]] = result[1];
	}

	return entries;
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
	private zuoraProductIdGuardianLookup: ZuoraProductIdToKey;
	constructor(catalog: ZuoraCatalog) {
		this.zuoraProductIdGuardianLookup = buildZuoraProductIdToKey(catalog);
	}

	parse(zuoraSubscription: ZuoraSubscription): GroupedGuardianSubscription {
		const { products: productsById, ...restSubscription } =
			ZuoraSubscriptionIndexer.byProductIds.groupSubscription(
				zuoraSubscription,
			);
		const { products: productsByKey, productsNotInCatalog } =
			this.buildGuardianSubscriptionProducts(productsById);
		return {
			...restSubscription,
			products: productsByKey,
			productsNotInCatalog,
		};
	}

	private buildGuardianSubscriptionProducts(
		zuoraSubscriptionProducts: IndexedZuoraSubscriptionRatePlansByProduct,
	): GroupedProducts {
		const [inCatalog, notInCatalogAndUndefined] = partitionByType(
			objectLeftJoin(
				// attaches any products not in the (filtered) catalog to `undefined`
				zuoraSubscriptionProducts,
				this.zuoraProductIdGuardianLookup,
			),
			(
				pair,
			): pair is [
				IndexedZuoraSubscriptionRatePlans,
				ZuoraProductKeyNode<ProductKey>,
			] => pair[1] !== undefined,
		);
		const guardianKeyToRatePlans: GuardianKeyToRatePlans<ProductKey> =
			groupMapSingleOrThrowCorrelated(
				inCatalog,
				buildGuardianRatePlansByProductKey,
				'duplicate product keys',
			);

		const notInCatalog: ZuoraSubscription['ratePlans'] =
			notInCatalogAndUndefined
				.flatMap(([x]) => objectValues(x).flat(1))
				.map((cs) => mapValue(cs, 'ratePlanCharges', (c) => objectValues(c)));

		// byNames could be unreliable as the names may not match the catalog names, should use product*Ids to correlate
		const productsNotInCatalog: IndexedZuoraSubscriptionRatePlansByProduct =
			ZuoraSubscriptionIndexer.byNames.groupRatePlans(notInCatalog);

		return { products: guardianKeyToRatePlans, productsNotInCatalog };
	}
}

function buildGuardianRatePlansByProductKey<P extends ProductKey>([
	zuoraSubscriptionRatePlans,
	zuoraProductKeyNode,
]: [IndexedZuoraSubscriptionRatePlans, ZuoraProductKeyNode<P>]): [
	P,
	GuardianRatePlans<P>,
] {
	const guardianRatePlans: GuardianRatePlans<P> = groupCollectByUniqueId(
		objectInnerJoin(
			zuoraSubscriptionRatePlans,
			zuoraProductKeyNode.productRatePlans,
		),
		buildGuardianRatePlansByRatePlanKey<P>(zuoraProductKeyNode.productKey),
		'duplicate rate plan keys',
	);
	return [zuoraProductKeyNode.productKey, guardianRatePlans];
}

function buildGuardianRatePlansByRatePlanKey<P extends ProductKey>(
	productKey: P,
) {
	return ([subscriptionRatePlan, zuoraProductRatePlanKeyNode]: [
		IndexedZuoraSubscriptionRatePlans[P],
		ZuoraProductRatePlanKeyNode<P>,
	]): [string, Array<GuardianRatePlan<P>>] => {
		return [
			zuoraProductRatePlanKeyNode.productRatePlanKey,
			new GuardianRatePlansBuilder<P>(
				zuoraProductRatePlanKeyNode.productRatePlanCharges,
				productKey,
				zuoraProductRatePlanKeyNode.productRatePlanKey,
			).buildGuardianRatePlans(subscriptionRatePlan),
		];
	};
}

class GuardianRatePlansBuilder<P extends ProductKey> {
	constructor(
		private productRatePlanCharges: ZuoraProductRatePlanChargeIdToKey,
		private productKey: P,
		private productRatePlanKey: ProductRatePlanKey<P>,
	) {}

	buildGuardianRatePlans(
		zuoraSubscriptionRatePlans: IndexedZuoraSubscriptionRatePlans[P],
	): Array<GuardianRatePlan<P>> {
		return zuoraSubscriptionRatePlans.map(
			(zuoraSubscriptionRatePlan: IndexedZuoraRatePlanWithCharges) => {
				return this.buildGuardianRatePlan(zuoraSubscriptionRatePlan);
			},
		);
	}

	buildGuardianRatePlan(
		zuoraSubscriptionRatePlan: IndexedZuoraRatePlanWithCharges,
	): GuardianRatePlan<P> {
		const { ratePlanCharges, ...rest } = zuoraSubscriptionRatePlan;

		const keys: GuardianCatalogKeys<P> = {
			productKey: this.productKey,
			productRatePlanKey: this.productRatePlanKey,
		};
		return {
			...rest,
			ratePlanCharges: this.buildGuardianRatePlanCharges(ratePlanCharges),
			...keys,
		};
	}

	private buildGuardianRatePlanCharges(
		zuoraSubscriptionRatePlanCharges: IndexedZuoraSubscriptionRatePlanCharges,
	): GuardianRatePlanCharges {
		return groupCollectByUniqueId(
			objectJoinBijective(
				this.productRatePlanCharges,
				zuoraSubscriptionRatePlanCharges,
			),
			([{ productRatePlanChargeKey }, subCharge]) => [
				productRatePlanChargeKey,
				subCharge,
			],
			'duplicate rate plan charge keys',
		);
	}
}
