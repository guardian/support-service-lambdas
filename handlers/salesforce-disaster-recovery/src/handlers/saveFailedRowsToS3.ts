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
	const { resultFiles, filePath } = event;

	const bucketName = process.env.S3_BUCKET;

	if (!bucketName) {
		throw new Error('Environment variables not set');
	}

	const failedRows: AccountRowResult[] = [];

	for (const file of resultFiles) {
		console.log('before calling');
		const fileString = await getFileFromS3({
			bucketName,
			filePath: file.Key,
		});
		console.log('after calling');

		const fileContent = JSON.parse(fileString) as Array<{ Output: string }>;

		for (const batch of fileContent) {
			const output = JSON.parse(batch.Output) as AccountRowResult[];
			const failedResults = output.filter((row) => !row.Success);
			failedRows.push(...failedResults);
		}
	}

	const content = convertArrayToCsv({
		arr: failedRows.map((row) => ({
			ZuoraAccountId: row.ZuoraAccountId,
			Errors: JSON.stringify(row.Errors),
		})),
	});

	await uploadFileToS3({
		bucketName,
		filePath,
		content,
	});
};
