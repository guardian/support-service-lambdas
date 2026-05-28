import { buildZuoraProductIdToKey } from '@modules/guardian-subscription/group/buildZuoraProductIdToKey';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import { getIfDefined } from '@modules/nullAndUndefined';
import { objectFromEntries } from '@modules/objectFunctions';
import type {
	ChargeOverride,
	NewProductRatePlan,
} from '@modules/zuora/orders/listOrdersBySubscriptionNumber';
import type {
	ProductRatePlanChargeId,
	ProductRatePlanId,
	ZuoraCatalog,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import type { ReplaceDayjs } from './relativeConverter';
import type {
	OptionalFlattenedAction,
	OptionalFlattenedChangePlan,
	OptionalFlattenedCreateSubscription,
	OptionalFlattenedOrderAction,
} from './removeDefaults';
import { defaultCurrency } from './removeDefaults';

export type ResolvedChargeOverride = Omit<
	ChargeOverride,
	'productRatePlanChargeId'
> & { chargeName: string };

export type ResolvedRatePlan = {
	productName: string;
	productRatePlanName: string;
	chargeOverrides?: ResolvedChargeOverride[];
};

type OrderAction = OptionalFlattenedOrderAction;

export type ResolvedGenericRatePlan = Omit<
	ReplaceDayjs<NewProductRatePlan>,
	'productRatePlanId' | 'chargeOverrides'
> &
	ResolvedRatePlan;

export type ResolvedCreateSubscription = Omit<
	Extract<OrderAction, { type: 'CreateSubscription' }>['createSubscription'],
	'subscribeToRatePlans'
> & { subscribeToRatePlans: ResolvedGenericRatePlan[] };

export type ResolvedChangePlan = Omit<
	Extract<OrderAction, { type: 'ChangePlan' }>['changePlan'],
	'newProductRatePlan'
> & { newProductRatePlan: ResolvedGenericRatePlan };

export type ResolvedOrderAction =
	| (Omit<
			Extract<OrderAction, { type: 'CreateSubscription' }>,
			'createSubscription'
	  > & {
			createSubscription: ResolvedCreateSubscription;
	  })
	| (Omit<Extract<OrderAction, { type: 'ChangePlan' }>, 'changePlan'> & {
			changePlan: ResolvedChangePlan;
	  })
	| Exclude<
			OrderAction,
			{ type: 'CreateSubscription' } | { type: 'ChangePlan' }
	  >;

export type ResolvedSubscriptionEvent = Omit<
	OptionalFlattenedAction,
	'orderActions'
> & {
	orderActions: ResolvedOrderAction[];
};

export class ResolveProductIds {
	private lookup: ProductLookupMap;
	constructor(catalog: ZuoraCatalog) {
		this.lookup = buildProductLookupMap(catalog);
	}

	resolveProductIds(
		actions: OptionalFlattenedAction[],
	): ResolvedSubscriptionEvent[] {
		const resolvedActions: ResolvedSubscriptionEvent[] = actions.map(
			({ orderActions, ...restAction }) => ({
				...restAction,
				orderActions: orderActions.map((orderAction) =>
					this.resolveOrderAction(
						orderAction,
						restAction.currency ?? defaultCurrency,
					),
				),
			}),
		);

		return resolvedActions;
	}

	private resolveOrderAction(
		orderAction: OrderAction,
		currency: IsoCurrency,
	): ResolvedOrderAction {
		switch (orderAction.type) {
			case 'ChangePlan': {
				const { changePlan, ...restOrderAction } = orderAction;
				return {
					...restOrderAction,
					changePlan: this.resolveChangePlan(changePlan, currency),
				};
			}
			case 'CreateSubscription': {
				const { createSubscription, ...restOrderAction } = orderAction;
				const resolvedCreateSubscription = this.resolveCreateSubscription(
					createSubscription,
					currency,
				);
				return {
					...restOrderAction,
					createSubscription: resolvedCreateSubscription,
				};
			}
			default:
				return orderAction; // unchanged - no ids to map
		}
	}

	private resolveCreateSubscription(
		createSubscription: OptionalFlattenedCreateSubscription,
		currency: IsoCurrency,
	) {
		const ratePlans = createSubscription.subscribeToRatePlans.map(
			({ productRatePlanId, chargeOverrides, ...restRatePlan }) =>
				({
					...restRatePlan,
					...this.resolveRatePlan(
						productRatePlanId,
						chargeOverrides ?? [],
						currency,
					),
				}) satisfies ResolvedGenericRatePlan,
		);
		const resolvedCreateSubscription: ResolvedCreateSubscription = {
			...createSubscription,
			subscribeToRatePlans: ratePlans,
		};
		return resolvedCreateSubscription;
	}

	private resolveChangePlan(
		changePlan: OptionalFlattenedChangePlan,
		currency: IsoCurrency,
	): ResolvedChangePlan {
		const { productRatePlanId, chargeOverrides, ...restRatePlan } =
			changePlan.newProductRatePlan;
		return {
			...changePlan,
			newProductRatePlan: {
				...restRatePlan,
				...this.resolveRatePlan(
					changePlan.newProductRatePlan.productRatePlanId,
					changePlan.newProductRatePlan.chargeOverrides ?? [],
					currency,
				),
			},
		};
	}

	private resolveRatePlan(
		productRatePlanId: ProductRatePlanId,
		chargeOverrides: ChargeOverride[],
		currency: IsoCurrency,
	): ResolvedRatePlan {
		const { productName, productRatePlanName, charges } = getIfDefined(
			this.lookup.get(productRatePlanId),
			'unknown product rate plan - wrong catalog?',
		);
		const chargeOverridesFiltered: ResolvedChargeOverride[] | undefined =
			chargeOverrides.flatMap(({ productRatePlanChargeId, pricing }) => {
				const chargeInfo = getIfDefined(
					charges.get(productRatePlanChargeId),
					'unknown charge id - wrong catalog?',
				);
				return pricing.recurringFlatFee.listPrice ===
					chargeInfo.pricing[currency] // ideally should check more than just the price
					? []
					: [
							{
								chargeName: chargeInfo.name,
								pricing,
							} satisfies ResolvedChargeOverride,
						];
			});

		return {
			productName,
			productRatePlanName,
			...(chargeOverridesFiltered.length > 0
				? { chargeOverrides: getIfDefined(chargeOverridesFiltered, '') }
				: {}),
		} satisfies ResolvedRatePlan;
	}
}

type ChargeInfo = {
	name: string;
	pricing: Record<IsoCurrency, number>;
};

type RatePlanInfo = {
	productName: string; // would be nice if we could use product catalog keys where available
	productRatePlanName: string;
	charges: Map<ProductRatePlanChargeId, ChargeInfo>;
};

type ProductLookupMap = Map<ProductRatePlanId, RatePlanInfo>;

function buildProductLookupMap(catalog: ZuoraCatalog): ProductLookupMap {
	const productIdMap = buildZuoraProductIdToKey(catalog);
	const result: ProductLookupMap = new Map();

	for (const productNode of productIdMap.values()) {
		for (const [ratePlanId, ratePlanNode] of productNode.productRatePlans) {
			result.set(ratePlanId, {
				productName: productNode.zuoraProduct.name,
				productRatePlanName: ratePlanNode.zuoraProductRatePlan.name,
				charges: new Map(
					[...ratePlanNode.productRatePlanCharges.entries()].map(
						([chargeId, charge]) => {
							const pricing: Record<IsoCurrency, number> = objectFromEntries(
								charge.pricing.flatMap(({ currency, price }) =>
									price === null ? [] : [[currency, price] as const],
								),
							);
							return [chargeId, { name: charge.name, pricing }];
						},
					),
				),
			});
		}
	}

	return result;
}
