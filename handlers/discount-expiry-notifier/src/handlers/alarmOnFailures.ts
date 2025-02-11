/* eslint-disable @typescript-eslint/require-await -- this is required to ensure the lambda returns a value*/
import type {
	BigQueryRecord,
	DiscountProcessingAttempt,
	RecordForEmailSend,
} from '../types';

export const handler = async (event: {
	discountExpiresOnDate: string;
	expiringDiscountsToProcessCount: number;
	expiringDiscountsToProcess: BigQueryRecord[];
	filteredSubsCount: number;
	filteredSubs: RecordForEmailSend[];
	discountProcessingAttempts: DiscountProcessingAttempt[];
	uploadAttemptStatus: string;
}) => {
	console.log('event', event);

	if (
		await failuresOccurred(
			event.discountProcessingAttempts,
			event.uploadAttemptStatus,
		)
	) {
		throw new Error('Errors occurred. Check logs.');
	}
	return {};
};

const failuresOccurred = async (
	discountProcessingAttempts: DiscountProcessingAttempt[],
	uploadAttemptStatus: string,
): Promise<boolean> => {
	return (
		uploadAttemptStatus === 'error' ||
		discountProcessingAttempts.some(
			(attempt) => attempt.detail.emailSendAttempt.status === 'skipped',
		)
	);
};
