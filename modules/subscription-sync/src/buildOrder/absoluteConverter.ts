import type dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { FlattenedAction } from '../flattenOrder';
import type { RelativeDate, SubscriptionEvent } from '../relativeConverter';

// export type RelativeDate = { days: number };
// export type ReplaceDayjs<T> = T extends RelativeDate
// 	? Dayjs
// 	: T extends string & { readonly __brand: string }
// 		? T
// 		: T extends Array<infer U>
// 			? Array<ReplaceDayjs<U>>
// 			: T extends object
// 				? { [K in keyof T]: ReplaceDayjs<T[K]> }
// 				: T;
//
// export type AbsoluteFlattenedAction = ReplaceDayjs<SubscriptionEvent>;

/**
 * replace all absolute dates with relative dates
 * @param orders
 */
export class AbsoluteConverter {
	constructor(private now: dayjs.Dayjs) {}

	toAbsoluteDates(orders: SubscriptionEvent[]): FlattenedAction[] {
		return orders.map((order) => {
			const absoluteOrderDate = this.toAbsoluteDate(order.orderDate);
			return {
				...order,
				orderDate: absoluteOrderDate,
				LastPlanAddedDate__c:
					order.LastPlanAddedDate__c === null
						? null
						: this.toAbsoluteDate(
								order.LastPlanAddedDate__c,
								absoluteOrderDate,
							),
				orderActions: order.orderActions.map(
					({
						ContractEffective,
						CustomerAcceptance,
						ServiceActivation,
						...restOrderAction
					}) => ({
						...restOrderAction,
						ContractEffective: this.toAbsoluteDate(
							ContractEffective,
							absoluteOrderDate,
						),
						CustomerAcceptance: this.toAbsoluteDate(
							CustomerAcceptance,
							absoluteOrderDate,
						),
						ServiceActivation: this.toAbsoluteDate(
							ServiceActivation,
							absoluteOrderDate,
						),
					}),
				),
			};
		});
	}

	private toAbsoluteDate(
		date: RelativeDate,
		relativeTo: Dayjs = this.now,
	): Dayjs {
		const today = relativeTo.startOf('day');
		return today.add(date.days, 'days');
	}
}
