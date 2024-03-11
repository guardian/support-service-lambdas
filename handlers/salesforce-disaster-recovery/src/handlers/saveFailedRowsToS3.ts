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
	console.log(event);
	const { resultFiles, filePath } = event;

	const bucketName = process.env.S3_BUCKET;

	if (!bucketName) {
		throw new Error('Environment variables not set');
	}

	const failedRows: AccountRowResult[] = [];
	console.log(failedRows.length);

	for (const file of resultFiles) {
		console.log(file);
		const fileString = await getFileFromS3({
			bucketName,
			filePath: file.Key,
		});

		const fileContent = JSON.parse(fileString) as Array<{ Output: string }>;
		console.log('before');
		for (const batch of fileContent) {
			console.log('batch');
			const output = JSON.parse(batch.Output) as AccountRowResult[];
			const failedResults = output.filter((row) => !row.Success);
			failedRows.push(...failedResults);
		}
	}
	console.log('here');

	const content = convertArrayToCsv({
		arr: failedRows.map((row) => ({
			ZuoraAccountId: row.ZuoraAccountId,
			Errors: JSON.stringify(row.Errors),
		})),
	});
	console.log('there');

	await uploadFileToS3({
		bucketName,
		filePath,
		content,
	});
};
