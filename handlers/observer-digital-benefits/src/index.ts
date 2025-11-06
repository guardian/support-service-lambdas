import { Lazy } from '@modules/lazy';
import { getIfDefined } from '@modules/nullAndUndefined';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type {
	ProductDetails,
	ProductKey,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import {
	isNewspaperProduct,
	ProductCatalogHelper,
} from '@modules/product-catalog/productCatalog';
import { logger } from '@modules/routing/logger';
import { createRoute, Router } from '@modules/routing/router';
import { stageFromEnvironment } from '@modules/stage';
import { getSubscription } from '@modules/supporter-product-data/supporterProductData';
import { zuoraDateFormat } from '@modules/zuora/utils';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import dayjs from 'dayjs';
import minMax from 'dayjs/plugin/minMax';
import z from 'zod';

const stage = stageFromEnvironment();
const productCatalogHelper = new Lazy(
	async () => new ProductCatalogHelper(await getProductCatalogFromApi(stage)),
	'Fetching product catalog',
);

const bodySchema = z.object({
	subscriptionId: z
		.string()
		.regex(
			/^A-S\d+$/,
			'Subscription number must start with A-S and be followed by digits',
		),
});
type RequestBody = z.infer<typeof bodySchema>;

export const handler: Handler = Router([
	createRoute({
		httpMethod: 'POST',
		path: '/is-active',
		handler: handleRequest,
		parser: {
			body: bodySchema,
		},
	}),
]);

const blendedRatePlans: Array<ProductRatePlanKey<'HomeDelivery'>> = [
	'Everyday',
	'EverydayPlus',
	'WeekendPlus',
	'Weekend',
	'SundayPlus',
	'Sunday',
];

export function hasObserverDigitalBenefits<P extends ProductKey>(
	productDetail: ProductDetails<P>,
) {
	return (
		isNewspaperProduct(productDetail.zuoraProduct) &&
		blendedRatePlans.includes(
			productDetail.productRatePlan as ProductRatePlanKey<'HomeDelivery'>,
		)
	);
}

async function handleRequest(
	event: APIGatewayProxyEvent,
	parsed: {
		body: RequestBody;
	},
): Promise<APIGatewayProxyResult> {
	const subscriptionNumber = parsed.body.subscriptionId;
	logger.mutableAddContext(subscriptionNumber);

	logger.log(`Checking subscription status`);
	const subscription = await getSubscription(stage, subscriptionNumber);
	logger.log(`Found subscription: ${JSON.stringify(subscription)}`);

	const productDetails = (await productCatalogHelper.get()).findProductDetails(
		getIfDefined(
			subscription?.productRatePlanId,
			'Product Rate Plan ID is undefined',
		),
	);
	if (!productDetails) {
		logger.log(`No product details found for subscription`);
		return buildResponse(false);
	}
	logger.log(`Product details: ${JSON.stringify(productDetails)}`);
	if (hasObserverDigitalBenefits(productDetails)) {
		return buildResponse(
			true,
			validUntilDateFromTermEndDate(subscription!.termEndDate),
		);
	}
	return buildResponse(false);
}

function validUntilDateFromTermEndDate(termEndDate: string): string {
	// The term end date is a year from acquisition or renewal but the user can cancel
	// at any point during that term so for the purpose of granting benefits we should
	// check at least once a month
	dayjs.extend(minMax);
	const maxValidDate = dayjs().add(1, 'months');
	return zuoraDateFormat(dayjs.min(dayjs(termEndDate), maxValidDate));
}

export function buildResponse(
	hasBenefits: boolean,
	termEndDate?: string,
): APIGatewayProxyResult {
	const validUntil = termEndDate
		? { validUntil: validUntilDateFromTermEndDate(termEndDate) }
		: undefined;
	return {
		body: JSON.stringify({
			active: hasBenefits,
			...validUntil,
		}),
		statusCode: 200,
	};
}
