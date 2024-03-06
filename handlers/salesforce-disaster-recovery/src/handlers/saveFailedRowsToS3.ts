import {
	type AccountRowResult,
	convertArrayToCsv,
	getFileFromS3,
	uploadFileToS3,
} from '../services';

export const handler = async (event: {
	resultFiles: Array<{ Key: string; Size: number }>;
	filePath: string;
}): Promise<void> => {
	const bucketName = process.env.S3_BUCKET;

	if (!bucketName) {
		throw new Error('Environment variables not set');
	}

	const failedUpdates: AccountRowResult[] = [];

	for (const file of event.resultFiles) {
		const fileString = await getFileFromS3({
			bucketName,
			filePath: file.Key,
		});

		const fileContent = JSON.parse(fileString) as Array<{ Output: string }>;

		for (const batch of fileContent) {
			const output = JSON.parse(batch.Output) as AccountRowResult[];
			const failedResults = output.filter((item) => !item.success);
			failedUpdates.push(...failedResults);
		}
	}

	const content = convertArrayToCsv({
		arr: failedUpdates.map((item) => ({
			...item,
			errors: JSON.stringify(item.errors),
		})),
	});

	await uploadFileToS3({
		bucketName,
		filePath: event.filePath,
		content,
	});
};
