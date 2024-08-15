import { createHmac, timingSafeEqual } from 'crypto';
import type { Stage } from '@modules/stage';
import type { SQSRecord } from 'aws-lambda';
import { getWebhookValidationSecret } from './hMacKey';

const stage = process.env.STAGE as Stage;

export interface BuyerDetails {
	buyer_details: {
		email: string;
	};
}

export const hasMatchingSignature = async (
	record: SQSRecord,
): Promise<boolean> => {
	const webhookValidationSecret = await getWebhookValidationSecret(stage);

	const signatureWithTs =
		record.messageAttributes['tickettailor-webhook-signature']?.stringValue;
	//todo seperate v1 t=1723730497,v1=69955b67e25acdebed35a369848f97cd59520ae184e25a31a415442818

	const hash = createHmac('sha256', webhookValidationSecret)
		.update(record.body)
		.digest('hex');

	if (typeof signatureWithTs === 'string') {
		const signature = signatureWithTs.split(',')[1]?.split('=')[1];
		if (typeof signature === 'string') {
			return timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
		} else {
			throw new Error('Invalid Signature on incoming request');
		}
	} else {
		throw new Error('No Signature on incoming request');
	}
};
