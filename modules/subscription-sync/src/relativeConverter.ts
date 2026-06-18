import type dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { FlattenedAction } from './flattenOrder';

export type RelativeDate = { days: number };
export type ReplaceDayjs<T> = T extends Dayjs
	? RelativeDate
	: T extends string & { readonly __brand: string }
		? T
		: T extends Array<infer U>
			? Array<ReplaceDayjs<U>>
			: T extends object
				? { [K in keyof T]: ReplaceDayjs<T[K]> }
				: T;

export type SubscriptionEvent = ReplaceDayjs<FlattenedAction>;

export type SubscriptionEventOrderAction =
	SubscriptionEvent['orderActions'][number];

/**
 * replace all absolute dates with relative dates
 * @param orders
 */
export class RelativeConverter {
	constructor(private now: dayjs.Dayjs) {}

	toRelativeDates(orders: FlattenedAction[]): SubscriptionEvent[] {
		return orders.map((order) => ({
			...order,
			orderDate: this.toRelativeDate(order.orderDate),
			LastPlanAddedDate__c:
				order.LastPlanAddedDate__c === null
					? null
					: this.toRelativeDate(order.LastPlanAddedDate__c, order.orderDate),
			orderActions: order.orderActions.map((action) => ({
				...action,
				ContractEffective: this.toRelativeDate(
					action.ContractEffective,
					order.orderDate,
				),
				CustomerAcceptance: this.toRelativeDate(
					action.CustomerAcceptance,
					order.orderDate,
				),
				ServiceActivation: this.toRelativeDate(
					action.ServiceActivation,
					order.orderDate,
				),
			})),
		}));
	}

	private toRelativeDate(
		date: Dayjs,
		relativeTo: Dayjs = this.now,
	): RelativeDate {
		const today = relativeTo.startOf('day');
		return { days: date.startOf('day').diff(today, 'day') };
	}
}
