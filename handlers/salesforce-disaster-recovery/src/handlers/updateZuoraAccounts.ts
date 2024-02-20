import {
	batchUpdateZuoraAccounts,
	convertCsvToAccountRows,
	getFileFromS3,
} from '../services';

export const handler = async (event: { filePath: string }) => {
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
	console.log(rows[0]);

	if (!rows[0]) {
		return;
	}

	const response = await batchUpdateZuoraAccounts({
		stage,
		accountRows: [rows[0]],
	});
	console.log(response);

	return {
		StatusCode: 200,
	};
};
