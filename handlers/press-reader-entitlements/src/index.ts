import { sortBy } from '@modules/arrayFunctions';
import { getIfDefined } from '@modules/nullAndUndefined';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type {
	ProductCatalog,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import type { SupporterRatePlanItem } from './dynamo';
import { getSupporterProductData } from './dynamo';
import { getIdentityId } from './identity';
import type { Member } from './xmlBuilder';
import { buildXml } from './xmlBuilder';

const stage = process.env.STAGE as Stage;

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);

	try {
		if (event.path === '/user-entitlements' && event.httpMethod === 'GET') {
			const userId = getIfDefined(
				event.queryStringParameters?.['userId'],
				'userId does not exist',
			);

			const memberDetails = await getMemberDetails(stage, userId);
			return {
				body: buildXml(memberDetails),
				statusCode: 200,
			};
		}

		return {
			body: 'Not found',
			statusCode: 404,
		};
	} catch (error) {
		console.log('Caught exception with message: ', error);
		if (error instanceof IdentityError) {
			return {
				body: 'User not found',
				statusCode: 404,
			};
		}

		return {
			body: 'Internal server error',
			statusCode: 500,
		};
	}
};

class IdentityError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'IdentityError';
	}
}

export async function getMemberDetails(
	stage: Stage,
	userId: string,
): Promise<Member> {
	const identityId = await getIdentityId(stage, userId);
	const latestSubscription = await getLatestSubscription(stage, identityId);
	return createMember(userId, latestSubscription);
}

function createMember(
	userId: string,
	latestSubscription: SupporterRatePlanItem | undefined,
): Member {
	return {
		userID: userId,
		products: latestSubscription
			? [
					{
						product: {
							productID: 'the-guardian',
							enddate: latestSubscription.termEndDate,
							startdate: latestSubscription.contractEffectiveDate,
						},
					},
					{
						product: {
							productID: 'the-observer',
							enddate: latestSubscription.termEndDate,
							startdate: latestSubscription.contractEffectiveDate,
						},
					},
				]
			: [],
	};
}

export async function getLatestSubscription(
	stage: Stage,
	identityId: string,
): Promise<SupporterRatePlanItem | undefined> {
	const supporterProductDataItems = await getSupporterProductData(
		stage,
		identityId,
	);

	if (supporterProductDataItems) {
		const productCatalog = await getProductCatalogFromApi(stage);

		return getLatestValidSubscription(
			productCatalog,
			supporterProductDataItems,
		);
	}

	return undefined;
}

export function getLatestValidSubscription(
	productCatalog: ProductCatalog,
	supporterProductData: SupporterRatePlanItem[],
): SupporterRatePlanItem | undefined {
	const validProducts: Array<ProductKey | undefined> = [
		'DigitalSubscription',
		'HomeDelivery',
		'NationalDelivery',
		'SubscriptionCard',
		'SupporterPlus',
		'TierThree',
		// ToDo: add Patron, currently not in product catalog
	] as const;

	const productCatalogHelper = new ProductCatalogHelper(productCatalog);

	const validSubscriptions = supporterProductData.filter((item) =>
		validProducts.includes(
			productCatalogHelper.findProductDetails(item.productRatePlanId)
				?.zuoraProduct,
		),
	);

	const latestSubscription = sortBy(
		validSubscriptions,
		(item) => item.termEndDate,
	).pop();

	return latestSubscription;
}
