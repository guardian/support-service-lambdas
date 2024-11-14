import { getIfDefined } from '@modules/nullAndUndefined';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { getClientAccessToken, getIdentityId } from './identity';
import type { SupporterRatePlanItem } from './supporterProductData';
import { getLatestSubscription } from './supporterProductData';
import type { Member } from './xmlBuilder';
import { buildXml } from './xmlBuilder';

const stage = process.env.STAGE as Stage;
let productCatalog: ProductCatalog | undefined = undefined;
let identityClientAccessToken: string | undefined = undefined;

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

		return {
			body: 'Internal server error',
			statusCode: 500,
		};
	}
};

export async function getMemberDetails(
	stage: Stage,
	userId: string,
): Promise<Member> {
	if (identityClientAccessToken === undefined) {
		identityClientAccessToken = await getClientAccessToken(stage);
	}
	const identityId = await getIdentityId(
		identityClientAccessToken,
		stage,
		userId,
	);
	if (productCatalog === undefined) {
		productCatalog = await getProductCatalogFromApi(stage);
	}
	const latestSubscription = await getLatestSubscription(
		stage,
		identityId,
		productCatalog,
	);
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
