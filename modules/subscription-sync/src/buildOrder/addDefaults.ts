import type {
	ChangePlanOrderAction,
	CreateSubscriptionOrderAction,
	SubscriptionTerms,
} from '@modules/zuora/orders/listOrdersBySubscriptionNumber';
import type {
	SubscriptionEvent,
	SubscriptionEventOrderAction,
} from '@modules/subscription-sync/src/relativeConverter';
import type {
	OptionalFlattenedAction,
	OptionalFlattenedChangePlan,
	OptionalFlattenedCreateSubscription,
	OptionalFlattenedOrderAction,
} from '../../src/removeDefaults';
import {
	actionDefaults,
	changePlanDefaults,
	changePlanNewProductRatePlanDefaults,
	orderActionDefaults,
	termsDefaults,
} from '../../src/removeDefaults';

const replaceDefaults = <D extends object, O extends Partial<D>>(
	obj: O,
	defaults: D,
): O & D => {
	return {
		...defaults,
		...obj,
	};
};

function addCreateSubscriptionDefaults(
	changePlan: OptionalFlattenedCreateSubscription,
): CreateSubscriptionOrderAction['createSubscription'] {
	const { terms, ...rest } = changePlan;
	const termsWithoutDefaults: SubscriptionTerms =
		terms === undefined ? termsDefaults : replaceDefaults(terms, termsDefaults);

	return {
		...rest,
		terms: termsWithoutDefaults,
	};
}

function addChangePlanDefaults(
	changePlan: OptionalFlattenedChangePlan,
): ChangePlanOrderAction['changePlan'] {
	const { newProductRatePlan, ...restChangePlan } = changePlan;
	const changePlanWithoutDefaults = replaceDefaults(
		restChangePlan,
		changePlanDefaults,
	);
	return {
		...changePlanWithoutDefaults,
		newProductRatePlan: replaceDefaults(
			newProductRatePlan,
			changePlanNewProductRatePlanDefaults,
		),
	};
}

function addOrderActionDefaults(
	orderAction: OptionalFlattenedOrderAction,
): SubscriptionEventOrderAction {
	const orderActionWithoutDefaults = replaceDefaults(
		orderAction,
		orderActionDefaults,
	);
	switch (orderActionWithoutDefaults.type) {
		case 'CreateSubscription': {
			const { createSubscription, ...rest } = orderActionWithoutDefaults;
			return {
				...rest,
				createSubscription: addCreateSubscriptionDefaults(createSubscription),
			};
		}
		case 'ChangePlan': {
			const { changePlan, ...rest } = orderActionWithoutDefaults;
			return {
				...rest,
				changePlan: addChangePlanDefaults(changePlan),
			};
		}
	}
	return orderActionWithoutDefaults;
}

function addOrderDefaults(action: OptionalFlattenedAction): SubscriptionEvent {
	// const test = replaceDefaults({hasNoDefault: 'helo', inBoth: undefined}, {wasRemoved: 'true', inBoth: 'ignored'})
	// logger.log(test)

	const { orderActions, ...restAction } = action;
	const actionWithoutDefaults = replaceDefaults(restAction, actionDefaults);

	const orderActionsWithoutDefaults: SubscriptionEventOrderAction[] =
		orderActions.map((orderAction) => {
			return addOrderActionDefaults(orderAction);
		});
	return {
		...actionWithoutDefaults,
		orderActions: orderActionsWithoutDefaults,
	} satisfies SubscriptionEvent;
}

/**
 * Removes any values from FlattenedSubscriptionData that match the provided defaults.
 */
export const addDefaults = (
	actions: OptionalFlattenedAction[],
): SubscriptionEvent[] => {
	return actions.map((action) => {
		return addOrderDefaults(action);
	});
};
