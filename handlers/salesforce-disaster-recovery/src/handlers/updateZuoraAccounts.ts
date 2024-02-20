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

	const batchSize = 50;
	console.log(rows.length);

	for (let i = 0; i < rows.length; i += batchSize) {
		if (i > 300) {
			throw new Error('Stop');
		}
		const batch = rows.slice(i, i + batchSize);

		const response = await batchUpdateZuoraAccounts({
			stage,
			accountRows: batch,
		});
		console.log(response);
	}

	return {
		StatusCode: 200,
	};
};
