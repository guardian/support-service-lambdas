import { Lazy } from '@modules/lazy';
import { getIfDefined } from '@modules/nullAndUndefined';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { ProductDetails } from '@modules/product-catalog/productCatalog';
import {
	isNewspaperProduct,
	ProductCatalogHelper,
} from '@modules/product-catalog/productCatalog';
import { logger } from '@modules/routing/logger';
import { createRoute, Router } from '@modules/routing/router';
import { stageFromEnvironment } from '@modules/stage';
import { getSubscription } from '@modules/supporter-product-data/supporterProductData';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import minMax from 'dayjs/plugin/minMax';
import z from 'zod';

const stage = stageFromEnvironment();
const productCatalogHelper = new Lazy(
	async () => new ProductCatalogHelper(await getProductCatalogFromApi(stage)),
	'Fetching product catalog',
);

const pathSchema = z.object({
	subscriptionNumber: z
		.string()
		.regex(
			/^A-S\d+$/,
			'Subscription number must start with A-S and be followed by digits',
		),
});
type ParsedPath = z.infer<typeof pathSchema>;

export const handler: Handler = Router([
	createRoute({
		httpMethod: 'GET',
		path: '/status/{subscriptionNumber}',
		handler: handleRequest,
		parser: {
			path: pathSchema,
		},
	}),
]);

function hasObserverDigitalBenefits(productDetail: ProductDetails) {
	return (
		isNewspaperProduct(productDetail.zuoraProduct) &&
		[
			'EveryDay',
			'EveryDayPlus',
			'WeekendPlus',
			'Weekend',
			'SundayPlus',
			'Sunday',
		].includes(productDetail.productRatePlan)
	);
}

async function handleRequest(
	event: APIGatewayProxyEvent,
	parsed: {
		path: ParsedPath;
	},
): Promise<APIGatewayProxyResult> {
	const subscriptionNumber = parsed.path.subscriptionNumber;
	logger.mutableAddContext(subscriptionNumber);

	console.log(`Checking subscription status`);
	const subscription = await getSubscription(stage, subscriptionNumber);
	console.log(`Found subscription: ${JSON.stringify(subscription)}`);

	const productDetails = (await productCatalogHelper.get()).findProductDetails(
		getIfDefined(
			subscription?.productRatePlanId,
			'Product Rate Plan ID is undefined',
		),
	);
	if (!productDetails) {
		console.log(`No product details found for subscription`);
		return buildResponse(false);
	}
	console.log(`Product details: ${JSON.stringify(productDetails)}`);
	if (hasObserverDigitalBenefits(productDetails)) {
		return buildResponse(
			true,
			validUntilDateFromTermEndDate(subscription!.termEndDate),
		);
	}
	return buildResponse(false);
}

function validUntilDateFromTermEndDate(termEndDate: string): Dayjs {
	// The term end date is a year from acquisition or renewal but the user can cancel
	// at any point during that term so for the purpose of granting benefits we should
	// check at least once a month
	dayjs.extend(minMax);
	const maxValidDate = dayjs().add(1, 'months');
	return dayjs.min(dayjs(termEndDate), maxValidDate);
}

function buildResponse(
	hasBenefits: boolean,
	validUntil?: Dayjs,
): APIGatewayProxyResult {
	return {
		body: JSON.stringify({
			hasObserverDigitalBenefits: hasBenefits,
			validUntil: validUntil ? validUntil.toDate().toISOString() : null,
		}),
		statusCode: 200,
	};
}
