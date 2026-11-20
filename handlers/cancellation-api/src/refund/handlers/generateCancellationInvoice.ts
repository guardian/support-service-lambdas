import dayjs from 'dayjs';
import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import { subscriptionNumberSchema } from '@modules/zuora/identifiers';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { generateAndPostNegativeInvoice } from '../zuora/negativeInvoice';
import { parseStepInput } from './stepInput';

const generateCancellationInvoiceInputSchema = z.object({
	subscriptionNumber: subscriptionNumberSchema,
	cancellationBillingDate: z.iso.date(),
});

export const handler = async (
	event: unknown,
): Promise<{ negativeInvoiceId: string }> => {
	const { subscriptionNumber, cancellationBillingDate } = parseStepInput(
		generateCancellationInvoiceInputSchema,
		event,
	);
	logger.resetContext();
	logger.mutableAddContext(subscriptionNumber);
	const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
	const negativeInvoiceId = await generateAndPostNegativeInvoice(zuoraClient, {
		subscriptionNumber,
		targetDate: dayjs(cancellationBillingDate),
		today: dayjs(),
	});
	return { negativeInvoiceId };
};
