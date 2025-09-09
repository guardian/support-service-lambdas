import { zuoraResponseSchema } from '@modules/zuora/types';
import type { ZuoraResponse } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

/**
 * Rejects a payment in Zuora using the Reject Payment API
 *
 * This function calls the Zuora REST API to reject a payment, typically used when
 * a chargeback is received from Stripe. The rejection creates a refund and sets
 * the payment status to failed.
 *
 * @param zuoraClient - Zuora client instance
 * @param paymentNumber - Payment number to reject (e.g., "P-12345")
 * @param rejectionReason - Reason for rejection (default: 'chargeback')
 * @returns Zuora response indicating success/failure
 */
export async function rejectPayment(
	zuoraClient: ZuoraClient,
	paymentNumber: string,
	rejectionReason: string = 'chargeback',
): Promise<ZuoraResponse> {
	const path = `/v1/gateway-settlement/payments/${paymentNumber}/reject`;
	const body = JSON.stringify({
		gatewayReconciliationStatus: 'payment_failed',
		gatewayReconciliationReason: rejectionReason,
		gatewayResponse: 'Payment disputed - chargeback received',
		gatewayResponseCode: '4855', // Stripe dispute chargeback reason code
	});

	return zuoraClient.post(path, body, zuoraResponseSchema);
}
