import { getIfDefined } from '@modules/nullAndUndefined';
import { z } from 'zod';
import { uploadFileToS3 } from '../s3';
import {
	BaseRecordForEmailSendSchema,
	BigQueryRecordSchema,
	DiscountProcessingAttemptSchema,
} from '../types';

export const SaveResultsInputSchema = z
	.object({
		discountExpiresOnDate: z.string(),
		allRecordsFromBigQueryCount: z.number(),
		allRecordsFromBigQuery: z.array(BigQueryRecordSchema),
		recordsForEmailSendCount: z.number(),
		recordsForEmailSend: z.array(BaseRecordForEmailSendSchema),
		discountProcessingAttempts: z.array(DiscountProcessingAttemptSchema),
	})
	.strict();
export type SaveResultsInput = z.infer<typeof SaveResultsInputSchema>;

export const handler = async (event: SaveResultsInput) => {
	try {
		const parsedEventResult = SaveResultsInputSchema.safeParse(event);

		if (!parsedEventResult.success) {
			throw new Error('Invalid event data');
		}
		const parsedEvent = parsedEventResult.data;
		const bucketName = getIfDefined<string>(
			process.env.S3_BUCKET,
			'S3_BUCKET environment variable not set',
		);

		const discountExpiresOnDate = getIfDefined<string>(
			parsedEvent.discountExpiresOnDate,
			'parsedEvent.discountExpiresOnDate variable not set',
		);

		const executionDateTime = new Date().toISOString();

		const filePath = `${discountExpiresOnDate}/${executionDateTime}`;
		console.log('filePath:', filePath);

		const s3UploadAttempt = await uploadFileToS3({
			bucketName,
			filePath,
			content: JSON.stringify(parsedEvent, null, 2),
		});
		console.log('s3UploadAttempt:', s3UploadAttempt);
		if (s3UploadAttempt.$metadata.httpStatusCode !== 200) {
			throw new Error('Failed to upload to S3');
		}
		return {
			...parsedEvent,
			s3UploadAttemptStatus: 'success',
			s3UploadAttempt,
			filePath,
		};
	} catch (error) {
		return {
			...event,
			s3UploadAttemptStatus: 'error',
			errorDetail:
				error instanceof Error ? error.message : JSON.stringify(error, null, 2),
		};
	}
};
