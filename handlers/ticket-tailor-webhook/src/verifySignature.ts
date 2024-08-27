import { createHmac, timingSafeEqual } from 'crypto';
import type { SQSRecord } from 'aws-lambda';
import type { HmacKey } from '../src';

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
	const signatureWithTimestamp =
		record.messageAttributes['tickettailor-webhook-signature']?.stringValue;

	if (typeof signatureWithTimestamp === 'string') {
		//Split the header parts out from the format `t=$epoch,v1=$hmacSignature`
		const signature = signatureWithTimestamp.split('v1=')[1];
		const timestamp = signatureWithTimestamp.split('t=')[1]?.split(',')[0];
		if (typeof signature === 'string' && typeof timestamp === 'string') {
			const hash = createHmac('sha256', validationSecret.secret)
				.update(timestamp.concat(record.body))
				.digest('hex');
			return timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
		} else {
			throw new Error('Unable to parse header');
		}
	} else {
		throw new Error('No signature on incoming request');
	}
};
