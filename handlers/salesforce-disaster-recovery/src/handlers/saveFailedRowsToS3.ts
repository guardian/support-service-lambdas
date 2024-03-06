import { type ActionUpdateResponse } from '@modules/zuora/actionUpdate';
import { convertArrayToCsv, getFileFromS3, uploadFileToS3 } from '../services';

export const handler = async (event: {
	resultFiles: Array<{ Key: string; Size: number }>;
	filePath: string;
}): Promise<void> => {
	const bucketName = process.env.S3_BUCKET;

	if (!bucketName) {
		throw new Error('Environment variables not set');
	}

	const failedUpdates: ActionUpdateResponse = [];

	for (const file of event.resultFiles) {
		const fileString = await getFileFromS3({
			bucketName,
			filePath: file.Key,
		});

		const fileContent = JSON.parse(fileString) as Array<{ Output: string }>;

		for (const batch of fileContent) {
			const results = JSON.parse(batch.Output) as ActionUpdateResponse;
			const failedResults = results.filter((item) => !item.Success);
			failedUpdates.push(...failedResults);
		}
	}

	await uploadFileToS3({
		bucketName,
		filePath: event.filePath,
		content: convertArrayToCsv({ arr: failedUpdates }),
	});
};
