/* eslint-disable @typescript-eslint/require-await -- this is required to ensure the lambda returns a value*/
import { AlarmOnFailuresInputSchema } from '../types';
import type {
	AlarmOnFailuresInput,
	ApplyCreditToAccountBalanceOutput,
} from '../types';

export const handler = async (event: AlarmOnFailuresInput) => {
	try {
		const parsedEventResult = AlarmOnFailuresInputSchema.safeParse(event);

		if (!parsedEventResult.success) {
			throw new Error('Error parsing event to type: AlarmOnFailuresInput');
		}
		const parsedEvent = parsedEventResult.data;
		console.log('Parsed event:', parsedEvent);
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
	applyCreditToAccountBalanceAttempts: ApplyCreditToAccountBalanceOutput[],
	s3UploadAttemptStatus: string,
): Promise<boolean> => {
	return (
		s3UploadAttemptStatus === 'error' ||
		applyCreditToAccountBalanceAttempts.some(
			(attempt) => !attempt.applyCreditToAccountBalanceAttempt.Success,
		)
	);
};
