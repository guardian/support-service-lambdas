import type { SQSEvent } from 'aws-lambda';
import { z } from 'zod';
import type { Dependencies } from './ports';
import { processVoucherRequest } from './processVoucherRequest';
import { sqsMessageSchema } from './schemas';

const snsNotificationSchema = z.object({
	Type: z.literal('Notification'),
	Message: z.string(),
});

const snsNonMessageTypes = z.object({
	Type: z.enum(['SubscriptionConfirmation', 'UnsubscribeConfirmation']),
});

/**
 * When a message arrives via SNS → SQS, the SQS body is an SNS envelope.
 * - Type "Notification": contains a `Message` field with the actual payload.
 * - Type "SubscriptionConfirmation"/"UnsubscribeConfirmation": SNS lifecycle
 *   messages that should be skipped.
 * - Otherwise: the body is a direct SQS message (no envelope).
 *
 * Returns the extracted message body, or `null` if the message should be skipped.
 */
function extractMessageBody(sqsBody: string): unknown {
	const body: unknown = JSON.parse(sqsBody);
	const notification = snsNotificationSchema.safeParse(body);
	if (notification.success) {
		return JSON.parse(notification.data.Message);
	}
	if (snsNonMessageTypes.safeParse(body).success) {
		return null;
	}
	return body;
}

export async function handleSqsEvent(
	event: SQSEvent,
	deps: Dependencies,
	campaignCode: string,
): Promise<void> {
	console.log(`Processing ${event.Records.length} SQS record(s)`);

	for (const record of event.Records) {
		console.log(`Processing SQS record: ${record.messageId}`);

		const messageBody = extractMessageBody(record.body);
		if (messageBody === null) {
			console.log(`Skipping SNS lifecycle message: ${record.messageId}`);
			continue;
		}

		const parsed = sqsMessageSchema.safeParse(messageBody);

		if (!parsed.success) {
			console.error(
				`Invalid message format: ${JSON.stringify(parsed.error.format())}`,
			);
			throw new Error('Invalid SQS message format');
		}

		const result = await processVoucherRequest(
			parsed.data,
			campaignCode,
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
