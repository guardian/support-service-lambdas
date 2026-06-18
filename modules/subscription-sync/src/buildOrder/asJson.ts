import type { NewAccount } from '@modules/zuora/orders/newAccount';
import type { PaymentMethod } from '@modules/zuora/orders/paymentMethods';
import { zuoraDateFormat } from '@modules/zuora/utils';
import type { Dayjs } from 'dayjs';
import type { ReplayOrder } from '@modules/subscription-sync/src/buildOrder/unflattenOrder';

export type ZuoraDate = string;
export type ReplaceDayjsWithZuora<T> = T extends Dayjs
	? ZuoraDate
	: T extends string
		? T
		: T extends Array<infer U>
			? Array<ReplaceDayjsWithZuora<U>>
			: T extends object
				? { [K in keyof T]: ReplaceDayjsWithZuora<T[K]> }
				: T;

export type OrderAsJson<P extends PaymentMethod> =
	ReplaceDayjsWithZuora<ReplayOrder> & {
		newAccount: NewAccount<P>;
	};

export function toZuoraDates<P extends PaymentMethod>(
	order: ReplayOrder,
	accountToUse: NewAccount<P>,
): OrderAsJson<P> {
	return {
		orderDate: zuoraDateFormat(order.orderDate),
		newAccount: accountToUse,
		subscriptions: order.subscriptions.map((subscription) => ({
			...subscription,
			customFields: {
				...subscription.customFields,
				LastPlanAddedDate__c:
					subscription.customFields.LastPlanAddedDate__c === null
						? null
						: zuoraDateFormat(subscription.customFields.LastPlanAddedDate__c),
			},
			orderActions: subscription.orderActions.map((orderAction) => ({
				...orderAction,
				triggerDates: orderAction.triggerDates.map((td) => ({
					...td,
					triggerDate: zuoraDateFormat(td.triggerDate),
				})),
			})),
		})),
	};
}
