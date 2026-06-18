import type { ListOrderOrder } from '@modules/zuora/orders/listOrdersBySubscriptionNumber';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { FlattenedAction } from '@modules/subscription-sync/src/flattenOrder';

export type ReplayOrder = {
	orderDate: Dayjs;
	subscriptions: ListOrderOrder['subscriptions'];
};

export function unflattenOrder(
	flattenedOrderData: FlattenedAction,
): ReplayOrder {
	return {
		orderDate: flattenedOrderData.orderDate,
		subscriptions: [
			{
				customFields: {
					...(flattenedOrderData.LastPlanAddedDate__c === null
						? { LastPlanAddedDate__c: dayjs('2000-01-01') } // ideally should leave as null
						: {
								LastPlanAddedDate__c: flattenedOrderData.LastPlanAddedDate__c,
							}),
					ReaderType__c: flattenedOrderData.ReaderType__c,
				},
				orderActions: flattenedOrderData.orderActions.map(
					({
						ContractEffective,
						CustomerAcceptance,
						ServiceActivation,
						...restAction
					}) => ({
						...restAction,
						triggerDates: [
							{
								name: 'ContractEffective',
								triggerDate: ContractEffective,
							},
							{
								name: 'CustomerAcceptance',
								triggerDate: CustomerAcceptance,
							},
							{
								name: 'ServiceActivation',
								triggerDate: ServiceActivation,
							},
						],
					}),
				),
			},
		],
	};
}
