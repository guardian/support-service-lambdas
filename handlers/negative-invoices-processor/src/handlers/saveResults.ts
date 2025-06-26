import { uploadFileToS3 } from '@modules/aws/s3';
import { getIfDefined } from '@modules/nullAndUndefined';
import { z } from 'zod';
import { InvoiceSchema, ProcessedInvoiceSchema } from '../types';

export const saveResultsInputSchema = z.object({
	invoicesCount: z.number(),
	invoices: z.array(InvoiceSchema),
	processedInvoices: z.array(ProcessedInvoiceSchema),
});
export type SaveResultsInput = z.infer<typeof saveResultsInputSchema>;

export const handler = async (event: SaveResultsInput) => {
	try {
		const parsedEventResult = saveResultsInputSchema.safeParse(event);
		if (!parsedEventResult.success) {
			throw new Error('Invalid event data');
		}
		const parsedEvent = parsedEventResult.data;
		const bucketName = getIfDefined<string>(
			process.env.S3_BUCKET,
			'S3_BUCKET environment variable not set',
		);

		const executionDateTime = new Date().toISOString();

		const filePath = executionDateTime;

		const s3UploadAttempt = await uploadFileToS3({
			bucketName,
			filePath,
			content: JSON.stringify(parsedEvent, null, 2),
		});
		console.log('S3 upload attempt:', s3UploadAttempt);
		if (s3UploadAttempt.$metadata.httpStatusCode !== 200) {
			throw new Error('Failed to upload to S3');
		}
		return {
			...parsedEvent,
			s3UploadAttemptStatus: 'success',
			filePath,
		};
	} catch (error) {
		return {
			...event,
			s3UploadAttemptStatus: 'error',
			error:
				error instanceof Error ? error.message : JSON.stringify(error, null, 2),
		};
	}
};
