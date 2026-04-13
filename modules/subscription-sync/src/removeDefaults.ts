import type { IsoCurrency } from '@modules/internationalisation/currency';
import { filterEntries, objectKeys } from '@modules/objectFunctions';
import type {
	ChangePlanOrderAction,
	ChargeOverride,
	CreateSubscriptionOrderAction,
	NewProductRatePlan,
	SubscriptionTerms,
} from '@modules/zuora/orders/listOrdersBySubscriptionNumber';
// import type { FlattenedAction, FlattenedOrderAction } from './flattenOrder';
import type {
	SubscriptionEvent,
	SubscriptionEventOrderAction,
} from './relativeConverter';

type OrderActionDefaults = {
	ContractEffective: { days: number };
	ServiceActivation: { days: number };
	CustomerAcceptance: { days: number };
	// we don't (yet) support defaults of each discriminated union value
};
type ActionDefaults = {
	currency: IsoCurrency;
	LastPlanAddedDate__c: { days: number } | null;
	ReaderType__c: string | null;
};
export const orderActionDefaults: OrderActionDefaults = {
	ContractEffective: { days: 0 },
	ServiceActivation: { days: 0 },
	CustomerAcceptance: { days: 0 },
};
export const defaultCurrency = 'GBP' as const;
export const actionDefaults: ActionDefaults = {
	currency: defaultCurrency,
	LastPlanAddedDate__c: { days: 0 },
	ReaderType__c: null, // or Direct for CreateSubscription
};
export const termsDefaults: SubscriptionTerms = {
	autoRenew: true,
	initialTerm: {
		period: 12,
		periodType: 'Month',
		termType: 'TERMED',
	},
	renewalSetting: 'RENEW_WITH_SPECIFIC_TERM',
	renewalTerms: [{ period: 12, periodType: 'Month' }],
};

export const changePlanDefaults: {
	subType: ChangePlanOrderAction['changePlan']['subType'];
} = {
	subType: 'Upgrade',
};
export const changePlanNewProductRatePlanDefaults: {
	chargeOverrides: ChargeOverride[];
} = {
	chargeOverrides: [],
};

const isEqual = (a: unknown, b: unknown): boolean => {
	return JSON.stringify(a) === JSON.stringify(b);
};

const omitDefaults = <
	T extends object,
	D extends { [K in keyof D]: K extends keyof T ? T[K] : never },
>(
	obj: T,
	defaults: D,
): OptionalDefaults<T, D> => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- utility function
	return filterEntries(
		obj,
		([key, value]) => !(key in defaults) || !isEqual(value, defaults[key]),
	) as OptionalDefaults<T, D>;
};

export type OptionalDefaults<T, D> = T extends unknown
	? Omit<T, Extract<keyof D, keyof T>> &
			Partial<Pick<T, Extract<keyof D, keyof T>>>
	: never;

type OptionalNewProductRatePlan = OptionalDefaults<
	NewProductRatePlan,
	typeof changePlanNewProductRatePlanDefaults
>;
export type OptionalFlattenedChangePlan = Omit<
	OptionalDefaults<
		ChangePlanOrderAction['changePlan'],
		typeof changePlanDefaults
	>,
	'newProductRatePlan'
> & { newProductRatePlan: OptionalNewProductRatePlan };

export type OptionalFlattenedCreateSubscription = Omit<
	CreateSubscriptionOrderAction['createSubscription'],
	'terms'
> & { terms?: OptionalFlattenedTerms };

type OptionalFlattedOrderActionCommonFields = OptionalDefaults<
	SubscriptionEventOrderAction,
	OrderActionDefaults
>;

export type OptionalFlattenedOrderAction =
	| (Omit<
			Extract<OptionalFlattedOrderActionCommonFields, { type: 'ChangePlan' }>,
			'changePlan'
	  > & {
			changePlan: OptionalFlattenedChangePlan;
	  })
	| (Omit<
			Extract<
				OptionalFlattedOrderActionCommonFields,
				{ type: 'CreateSubscription' }
			>,
			'createSubscription'
	  > & {
			createSubscription: OptionalFlattenedCreateSubscription;
	  })
	| Exclude<
			Exclude<OptionalFlattedOrderActionCommonFields, { type: 'ChangePlan' }>,
			{ type: 'CreateSubscription' }
	  >;

export type OptionalFlattenedAction = Omit<
	OptionalDefaults<SubscriptionEvent, ActionDefaults>,
	'orderActions'
> & {
	orderActions: OptionalFlattenedOrderAction[];
};
type OptionalFlattenedTerms = OptionalDefaults<
	SubscriptionTerms,
	typeof termsDefaults
>;

function removeCreateSubscriptionDefaults(
	changePlan: CreateSubscriptionOrderAction['createSubscription'],
) {
	const { terms, ...rest } = changePlan;
	const termsWithoutDefaults: OptionalFlattenedTerms = omitDefaults(
		terms,
		termsDefaults,
	);

	return {
		...rest,
		...(objectKeys(termsWithoutDefaults).length > 0
			? { terms: termsWithoutDefaults }
			: undefined),
	};
}

function removeChangePlanDefaults(
	changePlan: ChangePlanOrderAction['changePlan'],
) {
	const { newProductRatePlan, ...restChangePlan } = changePlan;
	const changePlanWithoutDefaults = omitDefaults(
		restChangePlan,
		changePlanDefaults,
	);
	return {
		...changePlanWithoutDefaults,
		newProductRatePlan: omitDefaults(
			newProductRatePlan,
			changePlanNewProductRatePlanDefaults,
		),
	};
}

function removeOrderActionDefaults(
	orderAction: SubscriptionEventOrderAction,
): OptionalFlattenedOrderAction {
	const orderActionWithoutDefaults = omitDefaults(
		orderAction,
		orderActionDefaults,
	);
	switch (orderActionWithoutDefaults.type) {
		case 'CreateSubscription': {
			const { createSubscription, ...rest } = orderActionWithoutDefaults;
			return {
				...rest,
				createSubscription:
					removeCreateSubscriptionDefaults(createSubscription),
			};
		}
		case 'ChangePlan': {
			const { changePlan, ...rest } = orderActionWithoutDefaults;
			return {
				...rest,
				changePlan: removeChangePlanDefaults(changePlan),
			};
		}
	}
	return orderActionWithoutDefaults;
}

function removeOrderDefaults(
	action: SubscriptionEvent,
): OptionalFlattenedAction {
	const { orderActions, ...restAction } = action;
	const actionWithoutDefaults = omitDefaults(restAction, actionDefaults);

	const orderActionsWithoutDefaults: OptionalFlattenedOrderAction[] =
		orderActions.map((orderAction) => {
			return removeOrderActionDefaults(orderAction);
		});
	return {
		...actionWithoutDefaults,
		orderActions: orderActionsWithoutDefaults,
	} satisfies OptionalFlattenedAction;
}

/**
 * Removes any values from FlattenedSubscriptionData that match the provided defaults.
 */
export function removeDefaults(
	actions: SubscriptionEvent[],
): OptionalFlattenedAction[] {
	return actions.map((action) => {
		return removeOrderDefaults(action);
	});
}
