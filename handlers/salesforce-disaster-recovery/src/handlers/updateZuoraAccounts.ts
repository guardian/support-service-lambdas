import { getFileFromS3 } from '../services';

export const handler = async (event: { filePath: string }) => {
	const bucketName = process.env.S3_BUCKET;

	if (!bucketName) {
		throw new Error('Environment variables not set');
	}

	const fileContent = await getFileFromS3({
		bucketName,
		filePath: event.filePath,
	});

	console.log(fileContent);

	return {
		StatusCode: 200,
	};
};
