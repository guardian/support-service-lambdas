import { z } from 'zod';
import { sendEmail } from '@modules/email/email';
import { logger } from '@modules/logger/logger';
import type { Stage } from '@modules/stage';
import { stageFromEnvironment } from '@modules/stage';
import type { SubscriptionNumber } from '@modules/zuora/identifiers';
import { subscriptionNumberSchema } from '@modules/zuora/identifiers';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { buildPaymentFailedEmail } from '../paymentFailedEmail';
import { getPaymentFailedEmailData } from '../zuora/paymentFailedEmailData';
import { parseStepInput } from './stepInput';

const sendPaymentFailedEmailInputSchema = z.object({
	subscriptionNumber: subscriptionNumberSchema,
	accountNumber: z.string().min(1),
	// the invoice whose payment failed
	invoiceId: z.string().min(1),
	// the failed payment
	paymentId: z.string().min(1),
});

/**
 * Sent only when the cancellation was backdated because a payment failed.
 */
export const handler = async (
	event: unknown,
): Promise<Record<string, never>> => {
	const { invoiceId, paymentId, ...input } = parseStepInput(
		sendPaymentFailedEmailInputSchema,
		event,
	);
	logger.resetContext();
	logger.mutableAddContext(input.subscriptionNumber);
	const stage = stageFromEnvironment();
	const zuoraClient = await ZuoraClient.create(stage);
	await sendPaymentFailedEmail(zuoraClient, stage, {
		...input,
		unpaidInvoiceId: invoiceId,
		failedPaymentId: paymentId,
	});
	return {};
};

export async function sendPaymentFailedEmail(
	zuoraClient: ZuoraClient,
	stage: Stage,
	input: {
		subscriptionNumber: SubscriptionNumber;
		accountNumber: string;
		unpaidInvoiceId: string;
		failedPaymentId: string;
	},
): Promise<void> {
	const emailMessage = buildPaymentFailedEmail(
		await getPaymentFailedEmailData(zuoraClient, input),
	);
	await sendEmail(stage, emailMessage, logger.log.bind(logger));
}
