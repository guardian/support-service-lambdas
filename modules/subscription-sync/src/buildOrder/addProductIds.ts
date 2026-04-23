import { buildZuoraProductIdToKey } from '@modules/guardian-subscription/group/buildZuoraProductIdToKey';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import { getIfDefined } from '@modules/nullAndUndefined';
import { objectFromEntries } from '@modules/objectFunctions';
import { logger } from '@modules/routing/logger';
import type {
	ChargeOverride,
	NewProductRatePlan,
} from '@modules/zuora/orders/listOrdersBySubscriptionNumber';
import type {
	ProductRatePlanChargeId,
	ProductRatePlanId,
	ZuoraCatalog,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import type {
	ResolvedChangePlan,
	ResolvedChargeOverride,
	ResolvedCreateSubscription,
	ResolvedOrderAction,
	ResolvedSubscriptionEvent,
} from '@modules/subscription-sync/src/resolveProductIds';
import type {
	OptionalFlattenedAction,
	OptionalFlattenedChangePlan,
	OptionalFlattenedCreateSubscription,
	OptionalFlattenedOrderAction,
} from '../removeDefaults';
import { defaultCurrency } from '../removeDefaults';

export type DeresolvedRatePlan = {
	productRatePlanId: ProductRatePlanId;
	chargeOverrides?: ChargeOverride[];
};

/**
 * this class takes the low level output of ResolveProductIds, which contains subscription data keyed off its catalog
 * names.
 *
 * It uses the provided catalog to look up the identically named products, and inserts the correct product ids into the
 * structures.
 *
 * This is useful if a subscription existed in production and we want to create a similar one in sandbox.
 */
export class AddProductIds {
	private lookup: ProductLookupMap;
	constructor(catalog: ZuoraCatalog) {
		this.lookup = buildProductLookupMap(catalog);
	}

	addProductIds(
		actions: ResolvedSubscriptionEvent[],
	): OptionalFlattenedAction[] {
		const resolvedActions: OptionalFlattenedAction[] = actions.map(
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
		orderAction: ResolvedOrderAction,
		currency: IsoCurrency,
	): OptionalFlattenedOrderAction {
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
		createSubscription: ResolvedCreateSubscription,
		currency: IsoCurrency,
	): OptionalFlattenedCreateSubscription {
		const ratePlans = createSubscription.subscribeToRatePlans.map(
			({
				productName,
				productRatePlanName,
				chargeOverrides,
				...restRatePlan
			}) =>
				({
					...restRatePlan,
					...this.resolveRatePlan(
						productName,
						productRatePlanName,
						chargeOverrides ?? [],
						currency,
					),
				}) satisfies NewProductRatePlan,
		);
		const resolvedCreateSubscription: OptionalFlattenedCreateSubscription = {
			...createSubscription,
			subscribeToRatePlans: ratePlans,
		};
		return resolvedCreateSubscription;
	}

	private resolveChangePlan(
		changePlan: ResolvedChangePlan,
		currency: IsoCurrency,
	): OptionalFlattenedChangePlan {
		const {
			productName,
			productRatePlanName,
			chargeOverrides,
			...restRatePlan
		} = changePlan.newProductRatePlan;
		return {
			...changePlan,
			newProductRatePlan: {
				...restRatePlan,
				...this.resolveRatePlan(
					changePlan.newProductRatePlan.productName,
					changePlan.newProductRatePlan.productRatePlanName,
					changePlan.newProductRatePlan.chargeOverrides ?? [],
					currency,
				),
			} satisfies NewProductRatePlan,
		};
	}

	private resolveRatePlan(
		productName: string,
		productRatePlanName: string,
		chargeOverrides: ResolvedChargeOverride[],
		currency: IsoCurrency,
	): DeresolvedRatePlan {
		const { productRatePlanId, charges } = getIfDefined(
			this.lookup.get(productName + '/' + productRatePlanName),
			`target catalog name rate plan names don't match source: ${productName} / ${productRatePlanName}`,
		);
		const chargeOverridesFiltered: ChargeOverride[] | undefined =
			chargeOverrides.flatMap(({ chargeName, pricing }) => {
				const chargeInfo = getIfDefined(
					charges.get(chargeName),
					"target catalog name rate plan charge names don't match source",
				);
				return pricing.recurringFlatFee.listPrice ===
					chargeInfo.pricing[currency] // ideally should check more than just the price
					? []
					: [
							{
								productRatePlanChargeId: chargeInfo.productRatePlanChargeId,
								pricing,
							} satisfies ChargeOverride,
						];
			});

		return {
			productRatePlanId,
			...(chargeOverridesFiltered.length > 0
				? { chargeOverrides: getIfDefined(chargeOverridesFiltered, '') }
				: {}),
		} satisfies DeresolvedRatePlan;
	}
}

type ChargeInfo = {
	productRatePlanChargeId: ProductRatePlanChargeId;
	pricing: Record<IsoCurrency, number>;
};

type RatePlanInfo = {
	productRatePlanId: ProductRatePlanId;
	charges: Map<string, ChargeInfo>;
};

type ProductLookupMap = Map<string, RatePlanInfo>;

function buildProductLookupMap(catalog: ZuoraCatalog): ProductLookupMap {
	const productIdMap = buildZuoraProductIdToKey(catalog);
	const result: ProductLookupMap = new Map();

	for (const productNode of productIdMap.values()) {
		for (const [ratePlanId, ratePlanNode] of productNode.productRatePlans) {
			const value = {
				productRatePlanId: ratePlanId,
				charges: new Map(
					[...ratePlanNode.productRatePlanCharges.entries()].map(
						([chargeId, charge]) => {
							const pricing: Record<IsoCurrency, number> = objectFromEntries(
								charge.pricing.flatMap(({ currency, price }) =>
									price === null ? [] : [[currency, price] as const],
								),
							);
							return [
								charge.name,
								{
									productRatePlanChargeId: chargeId,
									pricing,
								},
							];
						},
					),
				),
			};
			const key =
				productNode.zuoraProduct.name +
				'/' +
				ratePlanNode.zuoraProductRatePlan.name;
			logger.log('adding: ', key, value);
			result.set(key, value);
		}
	}

	return result;
}
