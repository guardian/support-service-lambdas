import { type Stage } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
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
	const zuoraClient = await ZuoraClient.create(stage as Stage);

	const BATCH_SIZE = 50;
	const THIRTY_SECONDS = 30000;

	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		console.log('Index: ', i);
		const batch = rows.slice(i, i + BATCH_SIZE);

		await batchUpdateZuoraAccounts({
			zuoraClient,
			accountRows: batch,
		});

		if (context.getRemainingTimeInMillis() < THIRTY_SECONDS) {
			return {
				StatusCode: 200,
				Test: 'OK',
			};
		}
	}

	return {
		StatusCode: 200,
	};
};
