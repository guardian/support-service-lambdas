/**
 * Identifies a cancellation's refund in Zuora, as the comment on the refund and invoice adjustments, so a retried step
 * can find what an earlier attempt did.
 */
export const getRefundKey = ({
	subscriptionNumber,
	cancellationOrderNumber,
}: {
	subscriptionNumber: string;
	cancellationOrderNumber: string;
}): string => `${subscriptionNumber}-${cancellationOrderNumber}`;
