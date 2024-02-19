import { actionUpdate } from '@modules/zuora/actionUpdate';
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

	const test = await actionUpdate(
		zuoraClient,
		JSON.stringify({
			objects: [
				{
					Id: '8ad09be48d8dc4c3018d9e1a015f0ce7',
					CrmId: 'test2',
					sfContactId__c: 'test2',
				},
				{
					Id: '8ad09be48d646537018d6573e8a830dd',
					CrmId: 'test2',
					sfContactId__c: 'test2',
				},
			],
			type: 'Account',
		}),
	);
	console.log(test);
};
