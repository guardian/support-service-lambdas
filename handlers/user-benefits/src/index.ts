import { buildAuthenticate } from '@modules/identity/apiGateway';
import type { IdentityUserDetails } from '@modules/identity/identity';
import { Lazy } from '@modules/lazy';
import type { UserBenefitsResponse } from '@modules/product-benefits/schemas';
import { getUserBenefits } from '@modules/product-benefits/userBenefits';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import { Router } from '@modules/routing/router';
import type { Stage } from '@modules/stage';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { getTrialInformation } from './trials';

const stage = process.env.STAGE as Stage;
const authenticate = buildAuthenticate(stage, []); //TODO: Do we have any required scopes?
const productCatalog = new Lazy(
	async () => await getProductCatalogFromApi(stage),
	'Get product catalog',
);

const getUserBenefitsResponse = async (
	stage: Stage,
	productCatalogHelper: ProductCatalogHelper,
	userDetails: IdentityUserDetails,
): Promise<UserBenefitsResponse> => {
	const benefits = await getUserBenefits(
		stage,
		productCatalogHelper,
		userDetails,
	);
	console.log(`Benefits for user ${userDetails.identityId} are: `, benefits);
	const trials = getTrialInformation(benefits);
	console.log(`Trials for user ${userDetails.identityId} are: `, trials);
	return {
		benefits,
		trials,
	};
};

export const userBenefitsHandler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	const maybeAuthenticatedEvent = await authenticate(event);

	if (maybeAuthenticatedEvent.type === 'failure') {
		return maybeAuthenticatedEvent.response;
	}

	const userBenefitsResponse = await getUserBenefitsResponse(
		stage,
		new ProductCatalogHelper(await productCatalog.get()),
		maybeAuthenticatedEvent.userDetails,
	);
	return {
		body: JSON.stringify(userBenefitsResponse),
		// https://www.fastly.com/documentation/guides/concepts/edge-state/cache/cache-freshness/#preventing-content-from-being-cached
		headers: {
			'Cache-Control': 'private, no-store',
		},
		statusCode: 200,
	};
};

const router = new Router([
	{
		httpMethod: 'GET',
		path: '/benefits/me',
		handler: userBenefitsHandler,
	},
]);

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);
	return router.routeRequest(event);
};
