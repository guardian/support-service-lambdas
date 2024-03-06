import {
	type BatchUpdateZuoraAccountsResponse,
	convertArrayToCsv,
	getFileFromS3,
	uploadFileToS3,
} from '../services';

export const handler = async (event: {
	resultFiles: Array<{ Key: string; Size: number }>;
}) => {
	const bucketName = process.env.S3_BUCKET;
	const filePath = process.env.FAILED_ROWS_FILE_PATH;

	if (!bucketName || !filePath) {
		throw new Error('Environment variables not set');
	}

	const failedUpdates: BatchUpdateZuoraAccountsResponse[] = [];

	for (const file of event.resultFiles) {
		const fileString = await getFileFromS3({
			bucketName,
			filePath: file.Key,
		});

		const fileContent = JSON.parse(fileString) as Array<{ Output: string }>;

		for (const batch of fileContent) {
			const results = JSON.parse(
				batch.Output,
			) as BatchUpdateZuoraAccountsResponse[];

			failedUpdates.push(...results.filter((item) => !item.success));
		}
	}

	const str = convertArrayToCsv({ arr: failedUpdates });

	const res = await uploadFileToS3({
		bucketName,
		filePath,
		content: str,
	});
	console.log(res);
};
