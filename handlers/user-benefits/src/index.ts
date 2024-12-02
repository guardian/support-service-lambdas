import { ValidationError } from '@modules/errors';
import { IdentityAuthorisationHelper } from '@modules/identity/identity';
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
