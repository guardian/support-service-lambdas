import type { SQSEvent } from 'aws-lambda';
import type { Dependencies } from './ports';
import { processVoucherRequest } from './processVoucherRequest';
import { sqsMessageSchema } from './schemas';

export async function handleSqsEvent(
	event: SQSEvent,
	deps: Dependencies,
): Promise<void> {
	console.log(`Processing ${event.Records.length} SQS record(s)`);

	for (const record of event.Records) {
		console.log(`Processing SQS record: ${record.messageId}`);

		const parsed = sqsMessageSchema.safeParse(JSON.parse(record.body));

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

		// TODO: Send confirmation email via Braze once DataExtensionName is configured in Braze

		console.log(
			`Successfully processed voucher request for identityId=${result.identityId}`,
		);
	}

	console.log('All SQS records processed successfully');
}
