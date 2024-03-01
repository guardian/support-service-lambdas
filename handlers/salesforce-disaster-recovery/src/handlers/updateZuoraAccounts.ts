// import { type Stage } from '@modules/stage';
// import { ZuoraClient } from '@modules/zuora/zuoraClient';
import {
	type AccountRow,
	// batchUpdateZuoraAccounts,
	// convertCsvToAccountRows,
	// getFileFromS3,
} from '../services';

export const handler = async (event: { Items: AccountRow[] }) => {
	console.log(event);
	await Promise.resolve();
	for (let i = 0; i < event.Items.length; i += 50) {
		console.log(event.Items[i]);
		// const batch = event.Items.slice(i, i + 50);
		// console.log(batch);
	}
	// console.log(event);
	// const stage = process.env.STAGE;
	// const bucketName = process.env.S3_BUCKET;

	// if (!stage || !bucketName) {
	// 	throw new Error('Environment variables not set');
	// }

	// const fileContent = await getFileFromS3({
	// 	bucketName,
	// 	filePath: event.filePath,
	// });

	// const rows = convertCsvToAccountRows({ csvString: fileContent }).filter(
	// 	(row) => row.Zuora__Zuora_Id__c,
	// );

	// const zuoraClient = await ZuoraClient.create(stage as Stage);

	// const startIndex = event.startIndex;
	// const endIndex = Math.min(startIndex + event.chunkSize, rows.length - 1);

	// for (let i = startIndex; i < endIndex; i += 50) {
	// 	const batch = rows.slice(i, i + 50);

	// 	await batchUpdateZuoraAccounts({
	// 		zuoraClient,
	// 		accountRows: batch,
	// 	});
	// }

	// return {
	// 	StatusCode: 200,
	// };
};
