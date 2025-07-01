/* eslint-disable @typescript-eslint/require-await -- this is required to ensure the lambda returns a value*/
import { AlarmOnFailuresInputSchema } from '../types';
import { validateInput } from '@modules/validation/index';
import type { AlarmOnFailuresInput, ProcessedInvoice } from '../types';

export const handler = async (event: AlarmOnFailuresInput) => {
	try {
		const parsedEvent = validateInput(
			event,
			AlarmOnFailuresInputSchema,
			'Error parsing event to type: AlarmOnFailuresInput',
		);
		console.log('Parsed event:', parsedEvent);

		const failuresDetected = shouldSendErrorNotification(
			parsedEvent.processedInvoices,
			parsedEvent.s3UploadAttemptStatus,
		);
		console.log('Failures detected:', failuresDetected);
		// if (
		// 	await shouldSendErrorNotification(
		// 		parsedEvent..applyCreditToAccountBalanceAttempts,
		// 		parsedEvent.s3UploadAttemptStatus,
		// 	)
		// ) {
		// 	throw new Error('Failure occurred. Check logs. ');
		// }
	} catch (error) {
		console.log('Error occurred:', error);
		throw new Error(
			error instanceof Error ? error.message : JSON.stringify(error, null, 2),
		);
	}
	return {};
};

export const shouldSendErrorNotification = async (
	processedInvoices: ProcessedInvoice[],
	s3UploadAttemptStatus: string,
): Promise<boolean> => {
	return (
		s3UploadAttemptStatus === 'error' ||
		processedInvoices.some(
			(attempt) => !attempt.applyCreditToAccountBalanceAttempt.Success,
		)
	);
};
