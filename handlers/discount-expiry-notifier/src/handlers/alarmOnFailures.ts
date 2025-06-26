/* eslint-disable @typescript-eslint/require-await -- this is required to ensure the lambda returns a value*/
import { z } from 'zod';
import {
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
		recordsForEmailSend: z.array(BigQueryRecordSchema),
		discountProcessingAttempts: z.array(DiscountProcessingAttemptSchema),
		s3UploadAttemptStatus: z.string(),
		filePath: z.string().optional(),
		errorDetail: z.string().optional(),
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
			await shouldSendErrorNotification(
				parsedEvent.discountProcessingAttempts,
				parsedEvent.s3UploadAttemptStatus,
			)
		) {
			throw new Error('Failure occurred. Check logs. ');
		}
	} catch (error) {
		console.log('Error occurred:', error);
		throw new Error(
			error instanceof Error ? error.message : JSON.stringify(error, null, 2),
		);
	}
	return {};
};

export const shouldSendErrorNotification = async (
	discountProcessingAttempts: DiscountProcessingAttempt[],
	s3UploadAttemptStatus: string,
): Promise<boolean> => {
	return (
		s3UploadAttemptStatus === 'error' ||
		discountProcessingAttempts.some(
			(attempt) =>
				!attempt.emailSendEligibility.isEligible &&
				ERROR_NOTIFICATION_REASONS.includes(
					attempt.emailSendEligibility.ineligibilityReason,
				),
		)
	);
};

const ERROR_NOTIFICATION_REASONS = [
	'Error getting sub status from Zuora',
	'No value for work email',
];
