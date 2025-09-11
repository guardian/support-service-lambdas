import { zuoraResponseSchema } from '@modules/zuora/types';
import type { ZuoraResponse } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

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
		gatewayResponseCode: '4855',
	});

	return zuoraClient.post(path, body, zuoraResponseSchema);
}
