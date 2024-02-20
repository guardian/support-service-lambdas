import { type Context } from 'aws-lambda';
import {
	batchUpdateZuoraAccounts,
	convertCsvToAccountRows,
	getFileFromS3,
} from '../services';

export const handler = async (
	event: { filePath: string },
	context: Context,
) => {
	console.log(context);
	const stage = process.env.STAGE;
	const bucketName = process.env.S3_BUCKET;

	if (!stage || !bucketName) {
		throw new Error('Environment variables not set');
	}

	const fileContent = await getFileFromS3({
		bucketName,
		filePath: event.filePath,
	});

	const rows = convertCsvToAccountRows({ csvString: fileContent });

	console.info(`Number of Zuora accounts left to process: ${rows.length}`);

	const BATCH_SIZE = 50;

	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		console.log(i);
		const batch = rows.slice(i, i + BATCH_SIZE);

		await batchUpdateZuoraAccounts({
			stage,
			accountRows: batch,
		});

		console.log(context.getRemainingTimeInMillis());

		// 30 seconds
		if (context.getRemainingTimeInMillis() < 30000) {
			return {
				StatusCode: 200,
			};
		}
	}

	return {
		StatusCode: 200,
	};
};
