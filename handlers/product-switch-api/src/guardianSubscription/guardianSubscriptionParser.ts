import { groupMapSingleOrThrow } from '@modules/arrayFunctions';
import { mapValue, objectJoin, objectLeftJoin } from '@modules/objectFunctions';
import type {
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
	RestRatePlan,
	RestSubscription,
	ZuoraPIdToPRPIdToSubscriptionRatePlans,
	ZuoraPRPIdToSubscriptionRatePlans,
	ZuoraRatePlanChargesByPRPCId,
	ZuoraRatePlanWithChargesByPRPCId,
} from './groupSubscriptionByZuoraCatalogIds';
import { groupSubscriptionByZuoraCatalogIds } from './groupSubscriptionByZuoraCatalogIds';

export type GuardianRatePlanCharges = Record<
	string, // guardian rate plan charge key e.g. 'Subscription' or 'Saturday' - FIXME use ProductRatePlanChargeKey<P> & string
	RatePlanCharge // is technically the zuora charge but we don't need to touch it
>;

export type GuardianRatePlan = {
	ratePlanCharges: GuardianRatePlanCharges;
} & RestRatePlan;

export type GuardianRatePlans<P extends ProductKey> = Record<
	ProductRatePlanKey<P> & string,
	GuardianRatePlan[]
>;
export type GuardianSubscriptionProducts = {
	[K in ProductKey]?: GuardianRatePlans<K>;
};
export type GuardianSubscription = {
	products: GuardianSubscriptionProducts;
} & RestSubscription;

type FFF<K extends ProductKey> = {
	[P in K]: GuardianRatePlans<P>;
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
): FFF<K> {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- utility function but TODO look again at this
	const entries: Partial<FFF<K>> = {} as unknown as Partial<FFF<K>>;
	for (const item of items) {
		const result = project(item);
		if (entries[result[0]]) {
			throw new Error(`${msg}: multiple entries for ${result[0]}`);
		}
		entries[result[0]] = result[1];
	}
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- utility function but TODO look again at this
	return entries as FFF<K>;
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
 * └─ products: GuardianSubscriptionProducts
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
 *    └─ ...(other products in catalog)...
 * It maintains all current and historical plans and charges.
 */
export class GuardianSubscriptionParser {
	private zuoraProductIdGuardianLookup: ZuoraProductIdToKey;
	constructor(catalog: ZuoraCatalog) {
		this.zuoraProductIdGuardianLookup = buildZuoraProductIdToKey(catalog);
	}

	parse(zuoraSubscription: ZuoraSubscription): GuardianSubscription {
		return mapValue(
			groupSubscriptionByZuoraCatalogIds(zuoraSubscription),
			'products',
			(zuoraSubscriptionProducts) =>
				this.buildGuardianSubscriptionProducts(zuoraSubscriptionProducts),
		);
	}

	private buildGuardianSubscriptionProducts(
		zuoraSubscriptionProducts: ZuoraPIdToPRPIdToSubscriptionRatePlans,
	): GuardianSubscriptionProducts {
		return groupMapSingleOrThrowCorrelated(
			objectLeftJoin(
				this.zuoraProductIdGuardianLookup,
				zuoraSubscriptionProducts,
			),
			buildGuardianRatePlansByProductKey,
			'duplicate product keys',
		);
	}
}

function buildGuardianRatePlansByProductKey<P extends ProductKey>([
	zuoraProductKeyNode,
	zuoraSubscriptionRatePlans,
]: [ZuoraProductKeyNode<P>, ZuoraPRPIdToSubscriptionRatePlans | undefined]): [
	P,
	GuardianRatePlans<P>,
] {
	const guardianRatePlans: GuardianRatePlans<P> = groupMapSingleOrThrow(
		objectLeftJoin(
			zuoraProductKeyNode.productRatePlans,
			zuoraSubscriptionRatePlans ?? {},
		),
		buildGuardianRatePlansByRatePlanKey,
		'duplicate rate plan keys',
	);
	return [zuoraProductKeyNode.productKey, guardianRatePlans];
}

function buildGuardianRatePlansByRatePlanKey<P extends ProductKey>([
	zuoraProductRatePlanKeyNode,
	subscriptionRatePlan,
]: [
	ZuoraProductRatePlanKeyNode<P>,
	ZuoraPRPIdToSubscriptionRatePlans[P] | undefined,
]): [ProductRatePlanKey<P> & string, GuardianRatePlan[]] {
	return [
		zuoraProductRatePlanKeyNode.productRatePlanKey,
		subscriptionRatePlan !== undefined
			? new GuardianRatePlansBuilder<P>(
					zuoraProductRatePlanKeyNode.productRatePlanCharges,
				).buildGuardianRatePlans(subscriptionRatePlan)
			: [],
	];
}

class GuardianRatePlansBuilder<P extends ProductKey> {
	constructor(
		private productRatePlanCharges: ZuoraProductRatePlanChargeIdToKey,
	) {}

	buildGuardianRatePlans(
		zuoraSubscriptionRatePlans: ZuoraPRPIdToSubscriptionRatePlans[P],
	): GuardianRatePlan[] {
		return zuoraSubscriptionRatePlans.map(
			(zuoraSubscriptionRatePlan: ZuoraRatePlanWithChargesByPRPCId) => {
				return this.buildGuardianRatePlan(zuoraSubscriptionRatePlan);
			},
		);
	}

	buildGuardianRatePlan(
		zuoraSubscriptionRatePlan: ZuoraRatePlanWithChargesByPRPCId,
	): GuardianRatePlan {
		return mapValue(
			zuoraSubscriptionRatePlan,
			'ratePlanCharges',
			(ratePlanCharges) => this.buildGuardianRatePlanCharges(ratePlanCharges),
		);
	}

	private buildGuardianRatePlanCharges(
		zuoraSubscriptionRatePlanCharges: ZuoraRatePlanChargesByPRPCId,
	): GuardianRatePlanCharges {
		return groupMapSingleOrThrow(
			objectJoin(this.productRatePlanCharges, zuoraSubscriptionRatePlanCharges),
			([{ productRatePlanChargeKey }, subCharge]) => [
				productRatePlanChargeKey,
				subCharge,
			],
			'duplicate rate plan charge keys',
		);
	}
}
