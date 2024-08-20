import { createHmac, timingSafeEqual } from 'crypto';
import type { SQSRecord } from 'aws-lambda';
import type { HmacKey } from './hMacKey';

export interface Payload {
	payload: {
		buyer_details: {
			email: string;
		};
	};
}

export const hasMatchingSignature = (
	record: SQSRecord,
	validationSecret: HmacKey,
): boolean => {
	const signatureWithTs =
		record.messageAttributes['tickettailor-webhook-signature']?.stringValue;

	if (typeof signatureWithTs === 'string') {
		const signature = signatureWithTs.split(',')[1]?.split('=')[1];
		const ts = signatureWithTs.split(',')[0]?.split('=')[1];
		if (typeof signature === 'string' && typeof ts === 'string') {
			const hash = createHmac('sha256', validationSecret.secret)
				.update(ts.concat(record.body))
				.digest('hex');

			console.log(`SignatureWithTS (split out) is:
			 ${signature}`);
			console.log(`generated hash is: 
			${hash}`);
			return timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
		} else {
			throw new Error('No ts on incoming request');
		}
	} else {
		throw new Error('No ts on incoming request');
	}
};
