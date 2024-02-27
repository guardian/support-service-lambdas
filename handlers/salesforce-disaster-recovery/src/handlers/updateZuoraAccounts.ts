import { type Stage } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import {
	batchUpdateZuoraAccounts,
	convertCsvToAccountRows,
	getFileFromS3,
} from '../services';

export type UpdateZuoraAccountsLambdaInput = {
	filePath: string;
	startIndex: number;
	chunkSize: number;
};

export const handler = async (event: UpdateZuoraAccountsLambdaInput) => {
	const stage = process.env.STAGE;
	const bucketName = process.env.S3_BUCKET;

	if (!stage || !bucketName) {
		throw new Error('Environment variables not set');
	}

	const fileContent = await getFileFromS3({
		bucketName,
		filePath: event.filePath,
	});

	const rows = convertCsvToAccountRows({ csvString: fileContent }).filter(
		(row) => row.Zuora__Zuora_Id__c,
	);

	const zuoraClient = await ZuoraClient.create(stage as Stage);

	const startIndex = event.startIndex;
	const endIndex = Math.min(startIndex + event.chunkSize, rows.length - 1);

	for (let i = startIndex; i < endIndex; i += 50) {
		console.log(startIndex, i);
		const batch = rows.slice(i, i + 50);

		await batchUpdateZuoraAccounts({
			zuoraClient,
			accountRows: batch,
		});
	}

	return {
		StatusCode: 200,
	};
};
