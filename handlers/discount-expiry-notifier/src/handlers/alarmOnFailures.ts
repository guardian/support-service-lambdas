/* eslint-disable @typescript-eslint/require-await -- this is required to ensure the lambda returns a value*/
import type {
	BaseRecordForEmailSend,
	BigQueryRecord,
	DiscountProcessingAttempt,
} from '../types';

export const handler = async (event: {
	discountExpiresOnDate: string;
	allRecordsFromBigQueryCount: number;
	allRecordsFromBigQuery: BigQueryRecord[];
	recordsForEmailSendCount: number;
	recordsForEmailSend: BaseRecordForEmailSend[];
	discountProcessingAttempts: DiscountProcessingAttempt[];
	uploadAttemptStatus: string;
}) => {
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
			(attempt) => attempt.emailSendAttempt.response.status === 'skipped',
		)
	);
};
