import { Lazy } from '@modules/lazy';
import type { UserBenefitsResponse } from '@modules/product-benefits/schemas';
import { getUserBenefitsExcludingStaff } from '@modules/product-benefits/userBenefits';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import {
	badRequest,
	buildErrorResponse,
} from '@modules/routing/apiGatewayResponses';
import { stageFromEnvironment } from '@modules/stage';
import { SupporterProductDataRepository } from '@modules/supporter-product-data/supporterProductData';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { buildHttpResponse } from './response';
import { getTrialInformation } from './trials';

const stage = stageFromEnvironment();
const productCatalogHelper = new Lazy(
	async () => new ProductCatalogHelper(await getProductCatalogFromApi(stage)),
	'Get product catalog helper',
);
const supporterProductDataRepository =
	SupporterProductDataRepository.create(stage);

const getUserBenefitsResponse = async (
	productCatalogHelper: ProductCatalogHelper,
	identityId: string,
): Promise<UserBenefitsResponse> => {
	const benefits = await getUserBenefitsExcludingStaff(
		supporterProductDataRepository,
		productCatalogHelper,
		identityId,
	);
	console.log(`Benefits for user ${identityId} are: `, benefits);
	const trials = getTrialInformation(benefits);
	console.log(`Trials for user ${identityId} are: `, trials);
	return { benefits, trials };
};

export const benefitsIdentityIdHandler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);
	try {
		const identityId = event.pathParameters?.identityId;
		if (!identityId) {
			return badRequest('Identity ID missing from request path');
		}

		const userBenefitsResponse = await getUserBenefitsResponse(
			await productCatalogHelper.get(),
			identityId,
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
