import { ValidationError } from '@modules/errors';
import { IdentityApiGatewayAuthenticator } from '@modules/identity/apiGateway';
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
const identityAuthenticator = new IdentityApiGatewayAuthenticator(stage, []); //TODO: Do we have any required scopes?

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);
	try {
		const authenticatedEvent = await identityAuthenticator.authenticate(event);
		if (authenticatedEvent.type === 'FailedAuthenticationResponse') {
			return authenticatedEvent;
		}
		console.log(`Identity ID is ${authenticatedEvent.identityId}`);
		const productCatalog = await getProductCatalogFromApi(stage);

		const userBenefitsResponse = await getUserBenefits(
			stage,
			new ProductCatalogHelper(productCatalog),
			authenticatedEvent.identityId,
		);
		return {
			body: JSON.stringify(userBenefitsResponse),
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
