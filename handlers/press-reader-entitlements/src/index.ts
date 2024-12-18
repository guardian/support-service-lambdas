import { Lazy } from '@modules/utils/lazy';
import { getIfDefined } from '@modules/utils/nullAndUndefined';
import { userHasGuardianEmail } from '@modules/product-benefits/userBenefits';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { Router } from '@modules/routing/router';
import type { Stage } from '@modules/utils/stage';
import { stageFromEnvironment } from '@modules/utils/stage';
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

const stage = stageFromEnvironment();
const lazyProductCatalog = new Lazy(
	async () => await getProductCatalogFromApi(stage),
	'Get product catalog',
);
const lazyIdentityClientAccessToken = new Lazy(
	async () => await getClientAccessToken(stage),
	'Get identity client access token',
);
const router = new Router([
	{
		httpMethod: 'GET',
		path: '/user-entitlements',
		handler: userEntitlementsHandler,
	},
]);

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);
	return router.routeRequest(event);
};

async function userEntitlementsHandler(
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
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

export async function getMemberDetails(
	stage: Stage,
	userId: string,
): Promise<Member> {
	const userDetails = await getUserDetails(
		await lazyIdentityClientAccessToken.get(),
		stage,
		userId,
	);
	if (userHasGuardianEmail(userDetails.email)) {
		return createMember(userId, {
			contractEffectiveDate: '1821-05-05',
			termEndDate: '2099-01-01',
		});
	}
	const latestSubscription = await getLatestSubscription(
		stage,
		userDetails.identityId,
		await lazyProductCatalog.get(),
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
