/* eslint-disable @typescript-eslint/require-await -- this is required to ensure the lambda returns a value*/
import { z } from 'zod';
import {
	BaseRecordForEmailSendSchema,
	BigQueryRecordSchema,
	DiscountProcessingAttemptSchema,
} from '../types';
import type { DiscountProcessingAttempt } from '../types';

export const AlarmOnFailuresInputSchema = z
	.object({
		discountExpiresOnDate: z.string(),
		allRecordsFromBigQueryCount: z.number(),
		allRecordsFromBigQuery: z.array(BigQueryRecordSchema),
		recordsForEmailSendCount: z.number(),
		recordsForEmailSend: z.array(BaseRecordForEmailSendSchema),
		discountProcessingAttempts: z.array(DiscountProcessingAttemptSchema),
		uploadAttemptStatus: z.string(),
	})
	.strict();
export type AlarmOnFailuresInput = z.infer<typeof AlarmOnFailuresInputSchema>;

export const handler = async (event: AlarmOnFailuresInput) => {
	try {
		const parsedEventResult = AlarmOnFailuresInputSchema.safeParse(event);

		if (!parsedEventResult.success) {
			throw new Error('Invalid event data');
		}
		const parsedEvent = parsedEventResult.data;
		if (
			await failuresOccurred(
				parsedEvent.discountProcessingAttempts,
				parsedEvent.uploadAttemptStatus,
			)
		) {
			throw new Error('Errors occurred. Check logs.');
		}
	} catch (error) {
		console.log('Error occurred:', error);
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
