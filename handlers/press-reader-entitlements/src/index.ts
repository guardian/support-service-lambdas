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

			const memberDetails = await getMemberDetails(userId, stage);
			return await Promise.resolve({
				body: buildXml(memberDetails),
				statusCode: 200,
			});
		}

		return await Promise.resolve({
			body: 'Not found',
			statusCode: 404,
		});
	} catch (error) {
		console.log('Caught exception with message: ', error);
		if (error instanceof IdentityError) {
			return await Promise.resolve({
				body: 'User not found',
				statusCode: 404,
			});
		}

		return await Promise.resolve({
			body: 'Internal server error',
			statusCode: 500,
		});
	}
};

type UserDetails = {
	userID: string;
	firstname: string;
	lastname: string;
};

class IdentityError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'IdentityError';
	}
}

async function getUserDetails(identityId: string): Promise<UserDetails> {
	// ToDo: get this from Identity, if we can't - return a 404
	try {
		return Promise.resolve({
			userID: identityId,
			firstname: 'Joe',
			lastname: 'Bloggs',
		});
	} catch (error) {
		throw new IdentityError(JSON.stringify(error));
	}
}

function createMember(
	userDetails: UserDetails,
	latestSubscription: SupporterRatePlanItem | undefined,
): Member {
	return {
		...userDetails,
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

export async function getMemberDetails(
	identityId: string,
	stage: Stage,
): Promise<Member> {
	const supporterProductDataItems = await getSupporterProductData(
		identityId,
		stage,
	);

	const user = await getUserDetails(identityId);

	if (supporterProductDataItems) {
		const productCatalog = await getProductCatalogFromApi(stage);

		const latestSubscription = getLatestValidSubscription(
			productCatalog,
			supporterProductDataItems,
		);

		return createMember(user, latestSubscription);
	}

	return createMember(user, undefined);
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
