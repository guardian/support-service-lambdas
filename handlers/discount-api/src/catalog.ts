import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import type { Stage } from '../../../modules/Stage';
import { catalogSchema } from './catalog.zod';

const client = new S3Client({
	region: 'eu-west-1',
	credentials: defaultProvider({ profile: 'membership' }),
});

export async function getCatalogFromS3(stage: Stage) {
	console.log('getCatalogFromS3');
	const command = new GetObjectCommand({
		Bucket: 'gu-zuora-catalog',
		Key: `PROD/Zuora-${stage}/catalog.json`,
	});

	try {
		const response = await client.send(command);
		const body = await response.Body?.transformToString();
		if (!body) {
			throw new Error('Catalog is undefined');
		}
		return catalogSchema.parse(JSON.parse(body));
	} catch (err) {
		console.error(err);
		throw err;
	}
}
