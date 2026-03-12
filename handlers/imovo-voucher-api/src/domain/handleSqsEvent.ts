import type { SQSEvent } from 'aws-lambda';
import { z } from 'zod';
import type { Dependencies } from './ports';
import { processVoucherRequest } from './processVoucherRequest';
import { sqsMessageSchema } from './schemas';

const snsEnvelopeSchema = z.object({
	Type: z.literal('Notification'),
	Message: z.string(),
});

/**
 * When a message arrives via SNS → SQS, the SQS body is an SNS envelope
 * containing a `Message` field with the actual payload as a JSON string.
 * For direct SQS messages, the body is the payload itself.
 */
function extractMessageBody(sqsBody: string): unknown {
	const body: unknown = JSON.parse(sqsBody);
	const envelope = snsEnvelopeSchema.safeParse(body);
	if (envelope.success) {
		return JSON.parse(envelope.data.Message);
	}
	return body;
}

export async function handleSqsEvent(
	event: SQSEvent,
	deps: Dependencies,
): Promise<void> {
	console.log(`Processing ${event.Records.length} SQS record(s)`);

	for (const record of event.Records) {
		console.log(`Processing SQS record: ${record.messageId}`);

		const parsed = sqsMessageSchema.safeParse(extractMessageBody(record.body));

		if (!parsed.success) {
			console.error(
				`Invalid message format: ${JSON.stringify(parsed.error.format())}`,
			);
			throw new Error('Invalid SQS message format');
		}

		const result = await processVoucherRequest(
			parsed.data,
			deps.voucherProvider,
			deps.voucherRepository,
		);

		console.log(
			`Voucher received: code=${result.voucherCode}, expires=${result.expiryDate}`,
		);

		await deps.emailSender.sendVoucherConfirmation(result);

		console.log(
			`Successfully processed voucher request for identityId=${result.identityId}`,
		);
	}

	console.log('All SQS records processed successfully');
}
