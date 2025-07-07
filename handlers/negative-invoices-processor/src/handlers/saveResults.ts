import { uploadFileToS3 } from '@modules/aws/s3';
import { getIfDefined } from '@modules/nullAndUndefined';
import { SaveResultsInputSchema } from '../types/handlerInputsAndOutputs';
import type {
	SaveResultsInput,
	SaveResultsOutput,
} from '../types/handlerInputsAndOutputs';

export const handler = async (
	event: SaveResultsInput,
): Promise<SaveResultsOutput> => {
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

		const filePath = generateFilePath();

		const s3UploadAttempt = await uploadFileToS3({
			bucketName,
			filePath,
			content: JSON.stringify(parsedEvent, null, 2),
		});

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

function generateFilePath(): string {
	const executionDateTime = new Date().toISOString();
	const date = executionDateTime.split('T')[0];
	return `${date}/${executionDateTime}.json`; //e.g. 2025-10-01/2025-10-01T12:56:12.111Z.json
}
