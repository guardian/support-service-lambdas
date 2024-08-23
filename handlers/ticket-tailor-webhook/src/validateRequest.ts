import { createHmac, timingSafeEqual } from 'crypto';
import type { SQSRecord } from 'aws-lambda';
import type { HmacKey } from './getSecrets';

export interface Payload {
	payload: {
		buyer_details: {
			email: string;
		};
	};
}

export const getTimestampAndSignature = (
	record: SQSRecord,
): [string, string] => {
	const signatureWithTs =
		record.messageAttributes['tickettailor-webhook-signature']?.stringValue;
	if (typeof signatureWithTs === 'string') {
		const timestamp = signatureWithTs.split(',')[0]?.split('t=')[1];
		const signature = signatureWithTs.split(',')[1]?.split('v1=')[1];
		if (timestamp && signature) {
			if (!isNaN(Number(timestamp))) {
				return [timestamp, signature];
			} else {
				throw new Error(
					`Invalid value for MessageAttribute 'tickettailor-webhook-signature' -> timestamp: ${timestamp}. Timestamp should be a numeric string.`,
				);
			}
		} else {
			throw new Error(
				`Invalid formatting of MessageAttribute 'tickettailor-webhook-signature': ${signatureWithTs}. Missing timestamp or signature.`,
			);
		}
	} else {
		throw new Error(
			'No valid value found for MessgeAttritbute: tickettailor-webhook-signature on incoming request.',
		);
	}
};

export const isWithinTimeWindow = (
	allowedTimeWindowInSeconds: number,
	timestamp: string,
	currentDateTime: Date,
): boolean => {
	const timestampEpochSeconds = Number(timestamp);
	//Date works in EpochMillis so need to divide to get seconds
	const currentEpochSeconds = Math.floor(currentDateTime.valueOf() / 1000);
	const timeDiff = currentEpochSeconds - timestampEpochSeconds;
	if (timeDiff < 0) {
		throw new Error(
			`Invalid Webhook Signature: timeStamp ${timestamp} is later than current time. Check it is not using EpochMillis.`,
		);
	} else {
		return timeDiff <= allowedTimeWindowInSeconds;
	}
};

export const hasMatchingSignature = (
	timestamp: string,
	signature: string,
	record: SQSRecord,
	validationSecret: HmacKey,
): boolean => {
	const hash = createHmac('sha256', validationSecret.secret)
		.update(timestamp.concat(record.body))
		.digest('hex');
	return timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
};

export const maxValidTimeWindowSeconds = 300;

export const validateRequest = (
	record: SQSRecord,
	validationSecret: HmacKey,
	currentDateTime: Date,
): boolean => {
	const [timestamp, signature]: [string, string] =
		getTimestampAndSignature(record);
	const withinTimeWindow: boolean = isWithinTimeWindow(
		maxValidTimeWindowSeconds,
		timestamp,
		currentDateTime,
	);
	const signatureMatches: boolean = hasMatchingSignature(
		timestamp,
		signature,
		record,
		validationSecret,
	);
	if (!signatureMatches) {
		throw Error(
			'Signatures do not match - check Ticket Tailor signing secret matches the one stored in AWS.',
		);
	} else if (!withinTimeWindow) {
		throw Error(
			`Webhook Signature timestamp ${timestamp} is older than ${maxValidTimeWindowSeconds} seconds. Webhook will not be processed.`,
		);
	} else {
		return true;
	}
};
