import { createHmac, timingSafeEqual } from 'crypto';
import type { Stage } from '@modules/stage';
import type { SQSRecord } from 'aws-lambda';
import { getWebhookValidationSecret } from './hMacKey';

const stage = process.env.STAGE as Stage;

export interface WebhookRequest {
	id: string;
	created_at: string;
	event: string;
	resource_url: string;
	payload: object;
}

export const hasMatchingSignature = async (
	record: SQSRecord,
): Promise<boolean> => {
	const webhookValidationSecret = await getWebhookValidationSecret(stage);

	const signatureWithTs =
		record.messageAttributes['tickettailor-webhook-signature']?.stringValue;

	const webhookRequest = JSON.parse(record.body) as WebhookRequest;

	console.log(`webhook request ${JSON.stringify(webhookRequest)}`);

	const payload = JSON.stringify(webhookRequest.payload).replaceAll('\\', '');

	console.log(`payload ${payload}`);
	if (typeof signatureWithTs === 'string') {
		const signature = signatureWithTs.split(',')[1]?.split('=')[1];
		const ts = signatureWithTs.split(',')[0]?.split('=')[1];
		if (typeof ts === 'string') {
			const hash = createHmac('sha256', webhookValidationSecret.secret)
				.update(ts + record.body)
				.digest('hex');

			if (typeof signature === 'string') {
				console.log(`SignatureWithTS (split out) is:
			 ${signature}`);
				console.log(`generated hash is: 
			${hash}`);
				return timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
			} else {
				throw new Error('Invalid Signature on incoming request');
			}
		} else {
			throw new Error('No ts on incoming request');
		}
	} else {
		throw new Error('No Signature on incoming request');
	}
};
