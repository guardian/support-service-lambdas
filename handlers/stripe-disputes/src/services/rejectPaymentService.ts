import type { Logger } from '@modules/routing/logger';
import { rejectPayment } from '@modules/zuora/payment';
import type { ZuoraResponse } from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

export async function rejectPaymentService(
	logger: Logger,
	zuoraClient: ZuoraClient,
	paymentNumber: string | undefined,
): Promise<boolean> {
	if (!paymentNumber) {
		logger.log('No payment number found, skipping payment rejection');
		return false;
	}

	logger.log(`Rejecting payment: ${paymentNumber}`);
	const rejectPaymentResponse: ZuoraResponse = await rejectPayment(
		zuoraClient,
		paymentNumber,
		'chargeback',
	);

	logger.log(
		'Payment rejection response:',
		JSON.stringify(rejectPaymentResponse),
	);

	return true;
}
