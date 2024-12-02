import { ValidationError } from '@modules/errors';
import {
	ExpiredTokenError,
	IdentityAuthorisationHelper,
	InvalidScopesError,
} from '@modules/identity/identity';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { getUserBenefits } from './userBenefits';

const stage = process.env.STAGE as Stage;
const identityAuthorisationHelper = new IdentityAuthorisationHelper(stage, []); //TODO: Do we have any required scopes?

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);
	try {
		const identityId =
			await identityAuthorisationHelper.identityIdFromRequest(event);
		console.log(`Identity ID is ${identityId}`);
		const productCatalog = await getProductCatalogFromApi(stage);

		const userBenefitsResponse = await getUserBenefits(
			stage,
			new ProductCatalogHelper(productCatalog),
			identityId,
		);
		return {
			body: JSON.stringify(userBenefitsResponse),
			statusCode: 200,
		};
	} catch (error) {
		console.log('Caught exception with message: ', error);
		if (error instanceof ExpiredTokenError) {
			return {
				body: 'Token has expired',
				statusCode: 401,
			};
		}
		if (error instanceof InvalidScopesError) {
			return {
				body: 'Token does not have the required scopes',
				statusCode: 403,
			};
		}
		if (error instanceof ValidationError) {
			return {
				body: error.message,
				statusCode: 403,
			};
		}
		return {
			body: 'Internal server error',
			statusCode: 500,
		};
	}
};
