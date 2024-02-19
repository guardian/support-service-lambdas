import { getFileFromS3 } from '../services';

export const handler = async (event: { filePath: string }) => {
	console.log(event);
	const bucketName = process.env.S3_BUCKET;

	if (!bucketName) {
		throw new Error('Environment variables not set');
	}

	const file = await getFileFromS3({ bucketName, filePath: event.filePath });
	console.log(file);

	return {
		StatusCode: 200,
	};
};
