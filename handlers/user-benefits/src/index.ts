import { ValidationError } from '@modules/errors';
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

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);
	try {
		const productCatalog = await getProductCatalogFromApi(stage);
		const identityId = event.queryStringParameters?.identityId;
		if (identityId === undefined) {
			throw new ValidationError('IdentityId is required');
		}

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
