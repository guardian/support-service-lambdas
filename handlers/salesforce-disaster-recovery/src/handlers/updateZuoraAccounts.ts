import { getSubscription } from '@modules/zuora/getSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { convertCsvToAccountRows, getFileFromS3 } from '../services';

export const handler = async (event: { filePath: string }) => {
	const bucketName = process.env.S3_BUCKET;

	if (!bucketName) {
		throw new Error('Environment variables not set');
	}

	const fileContent = await getFileFromS3({
		bucketName,
		filePath: event.filePath,
	});

	const rows = convertCsvToAccountRows({ csvString: fileContent });
	console.log(rows[0]);
	await testZuoraServiceCall();

	return {
		StatusCode: 200,
	};
};

const testZuoraServiceCall = async () => {
	const zuoraClient = await ZuoraClient.create('CODE');

	const subscription = await getSubscription(
		zuoraClient,
		'8ad09c9f8db5ab95018dc1fb9c3944e7',
	);
	console.log(subscription);
};
