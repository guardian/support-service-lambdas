import type { Dayjs } from 'dayjs';
import type { GetOrderResponse } from '@modules/zuora/orders/getOrder';

/**
 * Finds the cancellation effective date for a given subscription within an order,
 * by locating that subscription's `CancelSubscription` order action.
 *
 * // TODO:delete comment - if `cancellationEffectiveDate` were included directly
 * // on the subscription-events bus event, this Zuora round-trip (and this
 * // lookup) could be skipped entirely.
 */
export const getCancellationEffectiveDate = (
	order: GetOrderResponse,
	subscriptionNumber: string,
): Dayjs => {
	const subscription = order.order.subscriptions.find(
		(s) => s.subscriptionNumber === subscriptionNumber,
	);
	if (!subscription) {
		throw new Error(
			`Order ${order.order.orderNumber} does not contain subscription ${subscriptionNumber}`,
		);
	}

	const cancelAction = subscription.orderActions.find(
		(action) => action.type === 'CancelSubscription',
	);
	if (!cancelAction?.cancelSubscription) {
		throw new Error(
			`Order ${order.order.orderNumber} has no CancelSubscription order action for subscription ${subscriptionNumber}`,
		);
	}

	return cancelAction.cancelSubscription.cancellationEffectiveDate;
};
