import { type Stage } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import {
	batchUpdateZuoraAccounts,
	convertCsvToAccountRows,
	getFileFromS3,
} from '../services';

// export class MyError extends Error {
// 	constructor(message: string) {
// 		super(message);
// 		this.name = 'MyError';
// 	}
// }

export type UpdateZuoraAccountsLambdaInput = {
	filePath: string;
	startIndex: number;
	chunkSize: number;
};

export const handler = async (event: UpdateZuoraAccountsLambdaInput) => {
	// await Promise.resolve();
	// const error = new Error('message');
	// // @ts-expect-error This is a test
	// error.code = '429';
	// throw error;
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

	const newRows = Array.from({ length: 285 }, () => rows).flat();
	const newChunkSize = event.chunkSize * 285;

	const zuoraClient = await ZuoraClient.create(stage as Stage);

	const startIndex = event.startIndex;
	const endIndex = Math.min(startIndex + newChunkSize, newRows.length - 1);

	for (let i = startIndex; i < endIndex; i += 50) {
		console.log(i);
		const batch = newRows.slice(i, i + 50);

		await batchUpdateZuoraAccounts({
			zuoraClient,
			accountRows: batch,
		});
	}

	return {
		StatusCode: 200,
	};
};

// const arr2 = Array.from({ length: 100 }, () => arr).flat();
