import type { Dayjs } from 'dayjs';
import type { SubscriptionNumber } from '@modules/zuora/identifiers';
import type { GetOrderResponse } from '@modules/zuora/orders/getOrder';

/**
 * Finds the cancellation effective date for a given subscription within an order,
 * by locating that subscription's `CancelSubscription` order action.
 */
export const getCancellationEffectiveDate = (
	order: GetOrderResponse,
	subscriptionNumber: SubscriptionNumber,
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
