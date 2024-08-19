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
	payload: string;
}

export const hasMatchingSignature = async (
	record: SQSRecord,
): Promise<boolean> => {
	const webhookValidationSecret = await getWebhookValidationSecret(stage);

	const signatureWithTs =
		record.messageAttributes['tickettailor-webhook-signature']?.stringValue;

	const webhookRequest = JSON.parse(record.body) as WebhookRequest;

	const payload = JSON.stringify(JSON.parse(webhookRequest.payload)).replaceAll('\\', '')

	const hash = createHmac('sha256', webhookValidationSecret.secret)
		.update(payload)
		.digest('hex');

	if (typeof signatureWithTs === 'string') {
		const signature = signatureWithTs.split(',')[1]?.split('=')[1];
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
		throw new Error('No Signature on incoming request');
	}
};
