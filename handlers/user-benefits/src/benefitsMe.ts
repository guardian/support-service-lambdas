import { buildAuthenticate } from '@modules/identity/apiGateway';
import type { IdentityUserDetails } from '@modules/identity/oktaTokenHelper';
import { Lazy } from '@modules/lazy';
import type { UserBenefitsResponse } from '@modules/product-benefits/schemas';
import { getUserBenefits } from '@modules/product-benefits/userBenefits';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import { buildErrorResponse } from '@modules/routing/apiGatewayResponses';
import { stageFromEnvironment } from '@modules/stage';
import { SupporterProductDataRepository } from '@modules/supporter-product-data/supporterProductData';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { buildHttpResponse } from './response';
import { getTrialInformation } from './trials';

const stage = stageFromEnvironment();
const authenticate = buildAuthenticate(stage, []); //TODO: Do we have any required scopes?
const productCatalogHelper = new Lazy(
	async () => new ProductCatalogHelper(await getProductCatalogFromApi(stage)),
	'Get product catalog helper',
);
const supporterProductDataRepository =
	SupporterProductDataRepository.create(stage);

const getUserBenefitsResponse = async (
	productCatalogHelper: ProductCatalogHelper,
	userDetails: IdentityUserDetails,
): Promise<UserBenefitsResponse> => {
	const benefits = await getUserBenefits(
		supporterProductDataRepository,
		productCatalogHelper,
		userDetails,
	);
	console.log(`Benefits for user ${userDetails.identityId} are: `, benefits);
	const trials = getTrialInformation(benefits);
	console.log(`Trials for user ${userDetails.identityId} are: `, trials);
	return { benefits, trials };
};

export const benefitsMeHandler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);
	try {
		const maybeAuthenticatedEvent = await authenticate(event);

		if (maybeAuthenticatedEvent.type === 'failure') {
			return maybeAuthenticatedEvent.response;
		}

		const userBenefitsResponse = await getUserBenefitsResponse(
			await productCatalogHelper.get(),
			maybeAuthenticatedEvent.userDetails,
		);
		return buildHttpResponse(
			stage,
			event.headers['origin'],
			userBenefitsResponse,
		);
	} catch (error) {
		return buildErrorResponse(error);
	}
};
