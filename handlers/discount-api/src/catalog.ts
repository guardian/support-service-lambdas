import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import type { Stage } from '../../../modules/stage';
import type {
	Catalog,
	Pricing,
	ProductRatePlan,
	ProductRatePlanCharge,
} from './catalogSchema';
import { catalogSchema } from './catalogSchema';
import { checkDefined, isNotNull } from './nullAndUndefined';

const client = new S3Client({
	region: 'eu-west-1',
	credentials: defaultProvider({ profile: 'membership' }),
});

export async function getCatalogFromS3(stage: Stage): Promise<Catalog> {
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

export const getDiscountProductRatePlans = (catalog: Catalog) => {
	return catalog.products.find((product) => product.name === 'Discounts')
		?.productRatePlans;
};

export const getCatalogPriceForCurrency = (
	catalog: Catalog,
	productRatePlanId: string,
	currency: string,
) => {
	const catalogPlan: ProductRatePlan = checkDefined(
		catalog.products
			.flatMap((product) => product.productRatePlans)
			.find((productRatePlan) => productRatePlan.id === productRatePlanId),
		`ProductRatePlan with id ${productRatePlanId} not found in catalog`,
	);
	const prices = catalogPlan.productRatePlanCharges
		.map((charge: ProductRatePlanCharge) =>
			charge.pricing.find((price: Pricing) => price.currency === currency),
		)
		.map((price) => price?.price)
		.filter(isNotNull);

	return prices;
};
