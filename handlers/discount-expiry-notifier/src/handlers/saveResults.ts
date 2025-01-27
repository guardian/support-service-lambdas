import { convertArrayToCsv } from '../csv';
import { uploadFileToS3 } from '../s3';

export const handler = async () => {
    console.log('hello');
	const bucketName = 'discount-expiry-notifier-code';

	const failedRows = [
		{
			name: 'David',
			subName: 'a-S11111111',
		},
		{
			name: 'Rachel',
			subName: 'a-S22222222',
		},
	];

	const content = convertArrayToCsv({
		arr: failedRows.map((row) => ({
			name: row.name,
			subName: row.subName,
		})),
	});

	const filePath = 'abc/def';

	await uploadFileToS3({
		bucketName,
		filePath,
		content,
	});

	return {
		failedRowsCount: failedRows.length,
		failedRowsFilePath: filePath,
	};
};
