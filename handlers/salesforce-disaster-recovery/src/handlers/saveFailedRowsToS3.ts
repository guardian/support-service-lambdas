import { checkDefined } from '@modules/nullAndUndefined';
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

	const bucketName = checkDefined<string>(
		process.env.S3_BUCKET,
		'S3_BUCKET environment variable not set',
	);

	const failedRows: AccountRowWithResult[] = [];

	for (const file of resultFiles) {
		const fileString = await getFileFromS3({
			bucketName,
			filePath: file.Key,
		});

		const fileContent = JSON.parse(fileString) as { Cause: string };
		const cause = JSON.parse(fileContent.Cause) as {
			errorType: string;
			errorMessage: string;
		};

		console.log(cause);
		// for (const account of JSON.parse(
		// 	fileContent.Cause,
		// ) as AccountRowWithResult[]) {
		// 	failedRows.push(account);
		// 	// const output = JSON.parse(batch.Output) as AccountRowWithResult[];
		// 	// const failedResults = output.filter((row) => !row.Success);
		// 	// failedRows.push(...failedResults);
		// }
	}
	// console.log(failedRows);

	const content = convertArrayToCsv({
		arr: failedRows.map((row) => ({
			Id: row.Id,
			Zuora__Zuora_Id__c: row.Zuora__Zuora_Id__c,
			Zuora__Account__c: row.Zuora__Account__c,
			Contact__c: row.Contact__c,
			Errors: JSON.stringify(row.Errors),
		})),
	});

	await uploadFileToS3({
		bucketName,
		filePath,
		content,
	});
};
