import { ValidationError } from '@modules/errors';
import { getIfDefined } from '@modules/nullAndUndefined';
import { userHasGuardianEmail } from '@modules/product-benefits/userBenefits';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { getClientAccessToken, getUserDetails } from './identity';
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
			const xmlBody = buildXml(memberDetails);
			console.log(`Successful response body is ${xmlBody}`);
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
		if (error instanceof ValidationError) {
			console.log(`Validation failure: ${error.message}`);
			return {
				body: error.message,
				statusCode: 400,
			};
		}
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
	const userDetails = await getUserDetails(
		identityClientAccessToken,
		stage,
		userId,
	);
	if (userHasGuardianEmail(userDetails.email)) {
		return createMember(userId, {
			contractEffectiveDate: '1821-05-05',
			termEndDate: '2099-01-01',
		});
	}
	if (productCatalog === undefined) {
		productCatalog = await getProductCatalogFromApi(stage);
	}
	const latestSubscription = await getLatestSubscription(
		stage,
		userDetails.identityId,
		productCatalog,
	);
	return createMember(userId, latestSubscription);
}

function createMember(
	userId: string,
	latestSubscription:
		| Pick<SupporterRatePlanItem, 'termEndDate' | 'contractEffectiveDate'>
		| undefined,
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
