import { getSingleOrThrow } from '@modules/arrayFunctions';
import type { IsoCurrency } from '@modules/internationalisation/currency';
import { getIfDefined } from '@modules/nullAndUndefined';
import type {
	ListOrderOrders,
	OrderAction,
	TriggerDatesArray,
} from '@modules/zuora/orders/listOrdersBySubscriptionNumber';
import type { Dayjs } from 'dayjs';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
	? Omit<T, K>
	: never;
export type FlattenedOrderAction = DistributiveOmit<
	OrderAction,
	'triggerDates'
> &
	TriggerDates;

export type FlattenedAction = {
	orderDate: Dayjs;
	currency: IsoCurrency;
	LastPlanAddedDate__c: Dayjs | null;
	ReaderType__c: string | null;
	orderActions: FlattenedOrderAction[];
};
type TriggerDates = {
	ContractEffective: Dayjs;
	ServiceActivation: Dayjs;
	CustomerAcceptance: Dayjs;
};

function flattenTriggerDates(triggerDates: TriggerDatesArray) {
	const triggerDatesMap = Object.fromEntries(
		triggerDates.map(({ name, triggerDate }) => [name, triggerDate]),
	);
	const flatTriggerDates = {
		ContractEffective: getIfDefined(
			triggerDatesMap['ContractEffective'],
			'missing ContractEffective',
		),
		ServiceActivation: getIfDefined(
			triggerDatesMap['ServiceActivation'],
			'missing ServiceActivation',
		),
		CustomerAcceptance: getIfDefined(
			triggerDatesMap['CustomerAcceptance'],
			'missing CustomerAcceptance',
		),
	};
	return flatTriggerDates;
}

/**
 * makes an order chain it into a nicer format for readability
 *
 * @param events
 */
export function flattenOrder(events: ListOrderOrders): FlattenedAction[] {
	const actions: FlattenedAction[] = events.map((event) => {
		const sub = getSingleOrThrow(
			event.subscriptions,
			(msg) => new Error(`TODO ${msg}`),
		);

		const flatActions: FlattenedOrderAction[] = sub.orderActions.map(
			(action) => {
				const { triggerDates, ...restAction } = action;
				const flatTriggerDates = flattenTriggerDates(triggerDates);
				return {
					...flatTriggerDates,
					...restAction,
				} satisfies FlattenedOrderAction;
			},
		);

		return {
			orderDate: event.orderDate,
			currency: event.currency,
			LastPlanAddedDate__c: sub.customFields.LastPlanAddedDate__c,
			ReaderType__c: sub.customFields.ReaderType__c,
			orderActions: flatActions,
		} satisfies FlattenedAction;
	});

	return actions;
}
