import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import type { Stage } from '../../../modules/stage';
import type { Product, ProductRatePlan } from './catalogSchema';
import { catalogSchema } from './catalogSchema';
import { checkDefined } from './zuora/common';

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

	const response = await client.send(command);
	const body = await response.Body?.transformToString();
	if (!body) {
		throw new Error(
			'Response body was undefined when fetching the Catalog from S3',
		);
	}
	return catalogSchema.parse(JSON.parse(body));
}

export const getProductRatePlan = async (
	stage: Stage,
	productRatePlanId: string,
) => {
	const catalog = await getCatalogFromS3(stage);

	return catalog.products
		.flatMap((product: Product) => product.productRatePlans)
		.find((ratePlan: ProductRatePlan) => ratePlan.id === productRatePlanId);
};
