import {
	type AccountRowWithResult,
	convertArrayToCsv,
	getFileFromS3,
	uploadFileToS3,
} from '../services';

export const handler = async (event: {
	resultFiles: Array<{ Key: string; Size: number }>;
	filePath: string;
}): Promise<void> => {
	const { resultFiles, filePath } = event;

	const bucketName = process.env.S3_BUCKET;

	if (!bucketName) {
		throw new Error('Environment variables not set');
	}

	const failedRows: AccountRowWithResult[] = [];

	for (const file of resultFiles) {
		const fileString = await getFileFromS3({
			bucketName,
			filePath: file.Key,
		});

		const fileContent = JSON.parse(fileString) as Array<{ Output: string }>;

		for (const batch of fileContent) {
			const output = JSON.parse(batch.Output) as AccountRowWithResult[];
			const failedResults = output.filter((row) => !row.Success);
			failedRows.push(...failedResults);
		}
	}

	const content = convertArrayToCsv({
		arr: failedRows.map((row) => ({
			...row,
			Errors: JSON.stringify(row.Errors),
		})),
	});

	await uploadFileToS3({
		bucketName,
		filePath,
		content,
	});
};
