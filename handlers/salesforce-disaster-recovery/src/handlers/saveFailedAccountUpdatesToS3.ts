import {
	type AccountRow,
	type BatchUpdateZuoraAccountsResponse,
	getFileFromS3,
} from '../services';

export const handler = async (event: {
	resultFiles: Array<{ Key: string; Size: number }>;
}) => {
	console.log(event);
	const bucketName = process.env.S3_BUCKET;

	if (!bucketName) {
		throw new Error('Environment variables not set');
	}

	const failures: BatchUpdateZuoraAccountsResponse[] = [];

	for (const file of event.resultFiles) {
		console.log(file);
		const fileString = await getFileFromS3({
			bucketName,
			filePath: file.Key,
		});
		console.log(fileString);

		const fileContent = JSON.parse(fileString) as Array<{
			Input: { Items: AccountRow[] };
			Output: BatchUpdateZuoraAccountsResponse[];
		}>;
		console.log(fileContent);
		console.log(typeof fileContent[0]?.Input);
		console.log(typeof fileContent[0]?.Output);

		for (const batch of fileContent) {
			console.log(batch);
			failures.push(...batch.Output.filter((item) => !item.success));
		}

		console.log(fileContent);
	}

	console.log(failures);
};
