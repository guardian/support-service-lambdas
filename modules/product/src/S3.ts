import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { awsConfig } from '@modules/aws/config';
import type { ProductCatalog } from '@modules/product/productCatalog';
import { productCatalogSchema } from '@modules/product/productCatalogSchema';

const client = new S3Client(awsConfig);
export const getProductCatalogFromS3 = async (stage: string) => {
	console.log('getProductCatalogFromS3');
	const command = new GetObjectCommand({
		Bucket: 'gu-product-catalog',
		Key: `${stage}/product-catalog.json`,
	});

	const response = await client.send(command);
	const body = await response.Body?.transformToString();
	if (!body) {
		throw new Error(
			'Response body was undefined when fetching the Product Catalog from S3',
		);
	}
	return productCatalogSchema.parse(JSON.parse(body)) as ProductCatalog;
};
