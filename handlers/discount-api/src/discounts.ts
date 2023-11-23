import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { defaultProvider } from '@aws-sdk/credential-provider-node';

const client = new S3Client({
	region: 'eu-west-1',
	credentials: defaultProvider({ profile: 'membership' }),
});
export const getDiscountsFromS3 = async () => {
	console.log('getDiscountsFromS3');
	const command = new GetObjectCommand({
		Bucket: 'gu-zuora-catalog',
		Key: 'PROD/Zuora-CODE/catalog.json',
	});

	try {
		const response = await client.send(command);
		// The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.
		const str = await response.Body?.transformToString().then((str) =>
			JSON.parse(str),
		);
		const catalog = JSON.parse(str);
		console.log(str);
		return str;
	} catch (err) {
		console.error(err);
		throw err;
	}
};

export const testFunction = async () => {
	console.log('testFunction');
	return fetch('https://www.totaltypescript.com/swapi/people/1.json').then(
		(response) => response.json().then(() => 5),
	);
};
