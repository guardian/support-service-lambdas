import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { sumNumbers } from '@modules/arrayFunctions';
import { awsConfig } from '@modules/aws/config';
import { checkDefined, isNotNull } from '@modules/nullAndUndefined';
import type { Stage } from '@modules/stage';
import type {
	Catalog,
	Pricing,
	ProductRatePlan,
	ProductRatePlanCharge,
} from './catalogSchema';
import { catalogSchema } from './catalogSchema';

const client = new S3Client(awsConfig);

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

export const getZuoraCatalog = async (stage: Stage) => {
	const catalog = await getCatalogFromS3(stage);
	return new ZuoraCatalog(catalog);
};
export class ZuoraCatalog {
	constructor(private catalog: Catalog) {}

	public getDiscountProductRatePlans = () => {
		return this.catalog.products.find((product) => product.name === 'Discounts')
			?.productRatePlans;
	};

	public getCatalogPriceOfCharges = (
		productRatePlanId: string,
		currency: string,
	): number[] => {
		const catalogPlan: ProductRatePlan = checkDefined(
			this.catalog.products
				.flatMap((product) => product.productRatePlans)
				.find((productRatePlan) => productRatePlan.id === productRatePlanId),
			`ProductRatePlan with id ${productRatePlanId} not found in catalog`,
		);
		return catalogPlan.productRatePlanCharges
			.map((charge: ProductRatePlanCharge) =>
				charge.pricing.find((price: Pricing) => price.currency === currency),
			)
			.map((price) => price?.price)
			.filter(isNotNull);
	};

	public getCatalogPrice(productRatePlanId: string, currency: string): number {
		const chargePrices = this.getCatalogPriceOfCharges(
			productRatePlanId,
			currency,
		);
		return sumNumbers(chargePrices);
	}
}
