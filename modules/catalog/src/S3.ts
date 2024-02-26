import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { awsConfig } from '@modules/aws/config';
import type { Stage } from '@modules/stage';
import { ZuoraCatalog } from '@modules/catalog/zuoraCatalog';
import {
	type Catalog,
	zuoraCatalogSchema,
} from '@modules/catalog/zuoraCatalogSchema';

const client = new S3Client(awsConfig);

export async function getZuoraCatalogFromS3(stage: Stage): Promise<Catalog> {
	console.log('getZuoraCatalogFromS3');
	const command = new GetObjectCommand({
		Bucket: 'gu-zuora-catalog',
		Key: `PROD/Zuora-${stage}/catalog.json`,
	});

	const response = await client.send(command);
	const body = await response.Body?.transformToString();
	if (!body) {
		throw new Error(
			'Response body was undefined when fetching the Catalog from S3',
		);
	}
	return zuoraCatalogSchema.parse(JSON.parse(body));
}

export const getZuoraCatalog = async (stage: Stage) => {
	const catalog = await getZuoraCatalogFromS3(stage);
	return new ZuoraCatalog(catalog);
};
