import { z } from 'zod';
import { sendEmail } from '@modules/email/email';
import { logger } from '@modules/logger/logger';
import type { Stage } from '@modules/stage';
import { stageFromEnvironment } from '@modules/stage';
import { subscriptionNumberSchema } from '@modules/zuora/identifiers';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { buildPaymentFailedEmail } from '../paymentFailedEmail';
import { getPaymentFailedEmailData } from '../zuora/paymentFailedEmailData';

const sendPaymentFailedEmailInputSchema = z.object({
	subscriptionNumber: subscriptionNumberSchema,
	accountNumber: z.string().min(1),
	unpaidInvoiceId: z.string().min(1),
});

type SendPaymentFailedEmailInput = z.infer<
	typeof sendPaymentFailedEmailInputSchema
>;

/**
 * Sent only when the cancellation was backdated.
 */
export const handler = async (event: unknown): Promise<void> => {
	const input = sendPaymentFailedEmailInputSchema.parse(event);
	logger.resetContext();
	logger.mutableAddContext(input.subscriptionNumber);
	const stage = stageFromEnvironment();
	const zuoraClient = await ZuoraClient.create(stage);
	await sendPaymentFailedEmail(zuoraClient, stage, input);
};

export async function sendPaymentFailedEmail(
	zuoraClient: ZuoraClient,
	stage: Stage,
	input: SendPaymentFailedEmailInput,
): Promise<void> {
	const emailMessage = buildPaymentFailedEmail(
		await getPaymentFailedEmailData(zuoraClient, input),
	);
	await sendEmail(stage, emailMessage, logger.log.bind(logger));
}
