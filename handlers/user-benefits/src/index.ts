import { buildAuthenticate } from '@modules/identity/apiGateway';
import type { IdentityUserDetails } from '@modules/identity/identity';
import type { UserBenefitsResponse } from '@modules/product-benefits/schemas';
import { getUserBenefits } from '@modules/product-benefits/userBenefits';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import { ValidationError } from '@modules/utils/errors';
import { Lazy } from '@modules/utils/lazy';
import type { Stage } from '@modules/utils/stage';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
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

export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);
	if (!(event.path === '/benefits/me' && event.httpMethod === 'GET')) {
		return {
			body: 'Not Found',
			statusCode: 404,
		};
	}
	try {
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
	} catch (error) {
		console.log('Caught exception with message: ', error);
		if (error instanceof ValidationError) {
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
