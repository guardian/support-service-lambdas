import { createHmac, timingSafeEqual } from 'crypto';
import { getSecretValue } from '@modules/secrets-manager/getSecret';
import { stageFromEnvironment } from '@modules/stage';
import type { SQSRecord } from 'aws-lambda';

export type HmacKey = {
	secret: string;
};

export const getTimestampAndSignature = (
	record: SQSRecord,
): [string, string] | undefined => {
	const signatureWithTs =
		record.messageAttributes['tickettailor-webhook-signature']?.stringValue;

	if (!(typeof signatureWithTs === 'string')) {
		console.error(
			'No valid value found for MessgeAttritbute: tickettailor-webhook-signature on incoming request.',
		);
		return;
	}

	const timestamp = signatureWithTs.split(',')[0]?.split('t=')[1];
	const signature = signatureWithTs.split(',')[1]?.split('v1=')[1];

	if (!(timestamp && signature) || isNaN(Number(timestamp))) {
		console.error(
			`Invalid formatting of MessageAttribute 'tickettailor-webhook-signature': ${signatureWithTs}. Missing or incorrectly formatted timestamp or signature.`,
		);
		return;
	}

	return [timestamp, signature];
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
		console.error(
			`Invalid Webhook Signature: timeStamp ${timestamp} is later than current time. Check it is not using EpochMillis.`,
		);
		return false;
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

	try {
		console.log('Comparing generated hash and signature from request');
		return timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
	} catch (e) {
		if (e instanceof Error) {
			console.error(
				`Hash and signature comparison failed with the following error message: ${e.message}`,
			);
		} else {
			console.error(`Hash and signature comparison failed for Unknown reason.`);
		}

		return false;
	}
};

export const maxValidTimeWindowSeconds = 300;

export const validateRequest = async (record: SQSRecord): Promise<boolean> => {
	const validationSecret = await getSecretValue<HmacKey>(
		`${stageFromEnvironment()}/TicketTailor/Webhook-validation`,
	);

	const currentDateTime = new Date();

	const timestampAndSignature = getTimestampAndSignature(record);
	if (!timestampAndSignature) {
		return false;
	}

	const [timestamp, signature]: [string, string] = timestampAndSignature;
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
		console.warn(
			'Signatures do not match - check Ticket Tailor signing secret matches the one stored in AWS. Webhook will not be processed.',
		);
	}
	if (!withinTimeWindow) {
		console.warn(
			`Webhook Signature timestamp ${timestamp} is older than ${maxValidTimeWindowSeconds} seconds. Webhook will not be processed.`,
		);
	}
	return withinTimeWindow && signatureMatches;
};
