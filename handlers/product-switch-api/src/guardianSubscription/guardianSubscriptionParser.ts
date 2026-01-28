import { groupCollectByUniqueId } from '@modules/arrayFunctions';
import {
	mapValue,
	objectInnerJoin,
	objectJoinBijective,
} from '@modules/objectFunctions';
import type { RatePlanCharge, ZuoraSubscription } from '@modules/zuora/types';
import type { ZuoraCatalog } from '@modules/zuora-catalog/zuoraCatalogSchema';
import type {
	ProductKeyWithDiscount,
	ProductWithDiscountRatePlanKey,
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

export type GuardianRatePlans<P extends ProductKeyWithDiscount> = Record<
	ProductWithDiscountRatePlanKey<P>,
	GuardianRatePlan[]
>;
export type GuardianSubscriptionProducts = {
	[K in ProductKeyWithDiscount]?: GuardianRatePlans<K>;
};
export type GuardianSubscriptionWithProducts = {
	products: GuardianSubscriptionProducts;
} & RestSubscription;

type GuardianKeyToRatePlans<K extends ProductKeyWithDiscount> = {
	[P in K]?: GuardianRatePlans<P>;
};

/**
 * this is a bit like groupMapSingleOrThrow, only it maintains the relationship
 * between the key and value.
 * GuardianSubscriptionProducts
 * @param items
 * @param project
 */
function groupMapSingleOrThrowCorrelated<
	K extends ProductKeyWithDiscount,
	A,
	B,
>(
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

	parse(
		zuoraSubscription: ZuoraSubscription,
	): GuardianSubscriptionWithProducts {
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
			objectInnerJoin(
				// discards any products not in the (filtered) catalog
				zuoraSubscriptionProducts,
				this.zuoraProductIdGuardianLookup,
			),
			buildGuardianRatePlansByProductKey,
			'duplicate product keys',
		);
	}
}

function buildGuardianRatePlansByProductKey<P extends ProductKeyWithDiscount>([
	zuoraSubscriptionRatePlans,
	zuoraProductKeyNode,
]: [ZuoraPRPIdToSubscriptionRatePlans, ZuoraProductKeyNode<P>]): [
	P,
	GuardianRatePlans<P>,
] {
	const guardianRatePlans: GuardianRatePlans<P> = groupCollectByUniqueId(
		objectInnerJoin(
			zuoraSubscriptionRatePlans,
			zuoraProductKeyNode.productRatePlans,
		),
		buildGuardianRatePlansByRatePlanKey,
		'duplicate rate plan keys',
	);
	return [zuoraProductKeyNode.productKey, guardianRatePlans];
}

function buildGuardianRatePlansByRatePlanKey<P extends ProductKeyWithDiscount>([
	subscriptionRatePlan,
	zuoraProductRatePlanKeyNode,
]: [ZuoraPRPIdToSubscriptionRatePlans[P], ZuoraProductRatePlanKeyNode<P>]): [
	ProductWithDiscountRatePlanKey<P> & string,
	GuardianRatePlan[],
] {
	return [
		zuoraProductRatePlanKeyNode.productRatePlanKey,
		new GuardianRatePlansBuilder<P>(
			zuoraProductRatePlanKeyNode.productRatePlanCharges,
		).buildGuardianRatePlans(subscriptionRatePlan),
	];
}

class GuardianRatePlansBuilder<P extends ProductKeyWithDiscount> {
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
