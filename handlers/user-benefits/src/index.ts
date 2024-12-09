import { ValidationError } from '@modules/errors';
import type {
	AuthenticatedApiGatewayEvent,
	FailedAuthenticationResponse,
} from '@modules/identity/apiGateway';
import { IdentityApiGatewayAuthenticator } from '@modules/identity/apiGateway';
import { Lazy } from '@modules/lazy';
import type { UserBenefitsResponse } from '@modules/product-benefits/schemas';
import { getUserBenefits } from '@modules/product-benefits/userBenefits';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { getTrialInformation } from './trials';

const stage = process.env.STAGE as Stage;
const identityAuthenticator = new IdentityApiGatewayAuthenticator(stage, []); //TODO: Do we have any required scopes?
const productCatalog = new Lazy(
	async () => await getProductCatalogFromApi(stage),
	'Get product catalog',
);

const getUserBenefitsResponse = async (
	stage: Stage,
	productCatalogHelper: ProductCatalogHelper,
	identityId: string,
): Promise<UserBenefitsResponse> => {
	const benefits = await getUserBenefits(
		stage,
		productCatalogHelper,
		identityId,
	);
	console.log(`Benefits for user ${identityId} are: `, benefits);
	const trials = getTrialInformation(benefits);
	console.log(`Trials for user ${identityId} are: `, trials);
	return {
		benefits,
		trials,
	};
};

export const handler: Handler = async (
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
		const maybeAuthenticatedEvent:
			| AuthenticatedApiGatewayEvent
			| FailedAuthenticationResponse =
			await identityAuthenticator.authenticate(event);

		if (maybeAuthenticatedEvent.type === 'FailedAuthenticationResponse') {
			return maybeAuthenticatedEvent;
		}

		const userBenefitsResponse = await getUserBenefitsResponse(
			stage,
			new ProductCatalogHelper(await productCatalog.get()),
			maybeAuthenticatedEvent.identityId,
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
