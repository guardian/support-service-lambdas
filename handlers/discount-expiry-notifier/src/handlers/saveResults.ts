import { uploadFileToS3 } from '../s3';

export const handler = async () => {

	const bucketName = 'discount-expiry-notifier-code';

	const failedRows = [
        {
            name:'David',
            subName: 'a-S11111111'
        },
        {
            name:'Rachel',
            subName: 'a-S22222222'
        }
    ];

    const filePath = 'abc/def';

	await uploadFileToS3({
		bucketName,
		filePath,
		content: 'csv contents here...',
	});

	return {
		failedRowsCount: failedRows.length,
		failedRowsFilePath: filePath,
	};
};
