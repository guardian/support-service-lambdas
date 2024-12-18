import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { awsConfig } from '@modules/aws/config';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import type { Stage } from '@modules/utils/stage';
import { stageFromEnvironment } from '@modules/utils/stage';
import { getZuoraCatalogFromS3 } from '@modules/zuora-catalog/S3';
import type { Handler, S3CreateEvent } from 'aws-lambda';

const client = new S3Client(awsConfig);
export const handler: Handler = async (event: S3CreateEvent) => {
	console.log(`Input is ${JSON.stringify(event, null, 2)}`);
	const stage = stageFromEnvironment();
	await writeProductCatalogToS3(stage);
};

export const writeProductCatalogToS3 = async (stage: Stage) => {
	console.log('writeProductCatalogToS3');
	const zuoraCatalog = await getZuoraCatalogFromS3(stage);
	const productCatalog = generateProductCatalog(zuoraCatalog);
	//TODO: take this from the CDK definition
	const productCatalogBucketName = 'gu-product-catalog';
	const command = new PutObjectCommand({
		Bucket: productCatalogBucketName,
		Key: `${stage}/product-catalog.json`,
		ContentType: 'application/json',
		Body: JSON.stringify(productCatalog, null, 2),
	});

	try {
		const response = await client.send(command);
		console.log('Response from S3 was ', response);
	} catch (err) {
		console.error('An error occurred while writing the catalog to S3: ', err);
	}
};
