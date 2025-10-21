import { createHmac, timingSafeEqual } from 'crypto';
import { logger } from '@modules/routing/logger';
import { getSecretValue } from '@modules/secrets-manager/getSecret';
import { stageFromEnvironment } from '@modules/stage';
import type { ApiGatewayToSqsEvent } from './apiGatewayToSqsEvent';

export type HmacKey = {
	secret: string;
};

export const getTimestampAndSignature = (
	record: ApiGatewayToSqsEvent,
): [string, string] | undefined => {
	const signatureWithTs = record.headers['tickettailor-webhook-signature'];

	if (!signatureWithTs) {
		logger.error(
			'No valid value found for MessgeAttritbute: tickettailor-webhook-signature on incoming request.',
		);
		return;
	}

	const timestamp = signatureWithTs.split(',')[0]?.split('t=')[1];
	const signature = signatureWithTs.split(',')[1]?.split('v1=')[1];

	if (!(timestamp && signature) || isNaN(Number(timestamp))) {
		logger.error(
			`Invalid formatting of header 'tickettailor-webhook-signature': '${signatureWithTs}'. Missing or incorrectly formatted timestamp or signature.`,
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
		logger.error(
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
	record: ApiGatewayToSqsEvent,
	validationSecret: HmacKey,
): boolean => {
	const hash = createHmac('sha256', validationSecret.secret)
		.update(timestamp.concat(record.body))
		.digest('hex');

	try {
		logger.log('Comparing generated hash and signature from request');
		return timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
	} catch (e) {
		if (e instanceof Error) {
			logger.error(
				`Hash and signature comparison failed with the following error message: ${e.message}`,
			);
		} else {
			logger.error(`Hash and signature comparison failed for Unknown reason.`);
		}

		return false;
	}
};

export const maxValidTimeWindowSeconds = 300;

export const validateRequest = async (
	record: ApiGatewayToSqsEvent,
): Promise<boolean> => {
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
		logger.log(
			'Signatures do not match - check Ticket Tailor signing secret matches the one stored in AWS. Webhook will not be processed.',
		);
	}
	if (!withinTimeWindow) {
		logger.log(
			`Webhook Signature timestamp ${timestamp} is older than ${maxValidTimeWindowSeconds} seconds. Webhook will not be processed.`,
		);
	}
	return withinTimeWindow && signatureMatches;
};
