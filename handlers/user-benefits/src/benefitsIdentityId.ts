import { Lazy } from '@modules/lazy';
import type { UserBenefitsResponse } from '@modules/product-benefits/schemas';
import { getUserBenefitsExcludingStaff } from '@modules/product-benefits/userBenefits';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { buildHttpResponse } from './response';
import { getTrialInformation } from './trials';

const stage = process.env.STAGE as Stage;
const productCatalog = new Lazy(
	async () => await getProductCatalogFromApi(stage),
	'Get product catalog',
);

const getUserBenefitsResponse = async (
	stage: Stage,
	productCatalogHelper: ProductCatalogHelper,
	identityId: string,
): Promise<UserBenefitsResponse> => {
	const benefits = await getUserBenefitsExcludingStaff(
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

export const benefitsIdentityIdHandler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);

	const identityId = event.pathParameters?.identityId;
	if (!identityId) {
		return {
			statusCode: 400,
			body: JSON.stringify({
				message: 'Identity ID missing from request path',
			}),
		};
	}

	const userBenefitsResponse = await getUserBenefitsResponse(
		stage,
		new ProductCatalogHelper(await productCatalog.get()),
		identityId,
	);

	return buildHttpResponse(userBenefitsResponse);
};
