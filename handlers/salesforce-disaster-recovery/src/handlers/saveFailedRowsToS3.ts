import { checkDefined } from '@modules/nullAndUndefined';
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

	const bucketName = checkDefined<string>(
		process.env.S3_BUCKET,
		'S3_BUCKET environment variable not set',
	);

	const failedRows: AccountRowResult[] = [];

	for (const file of resultFiles) {
		const fileString = await getFileFromS3({
			bucketName,
			filePath: file.Key,
		});

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
