import { getUserBenefitsExcludingStaff } from '@modules/product-benefits/userBenefits';
import type { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { benefitsIdentityIdHandler } from '../src/benefitsIdentityId';

jest.mock('@modules/product-catalog/api', () => ({
	getProductCatalogFromApi: () => ({}),
}));
const goodIdentityId = 'good-identity-id';
jest.mock('@modules/product-benefits/userBenefits', () => ({
	getUserBenefitsExcludingStaff: jest.fn(
		(
			stage: Stage,
			productCatalogHelper: ProductCatalogHelper,
			identityId: string,
		) => {
			if (identityId === 'good-identity-id') {
				return ['adFree'];
			} else {
				return [];
			}
		},
	),
}));

beforeEach(() => {
	jest.clearAllMocks();
});

describe('benefitsIdentityIdHandler', () => {
	it('returns a 400 when the identityId path part is missing', async () => {
		const requestEvent = {
			path: '/benefits/',
			httpMethod: 'GET',
			pathParameters: { identityId: undefined },
		} as unknown as APIGatewayProxyEvent;

		const response = await benefitsIdentityIdHandler(requestEvent);

		expect(response.statusCode).toEqual(400);
	});

	it('returns a 200 with benefits retrieved for the identityId', async () => {
		const requestEvent = {
			path: `/benefits/${goodIdentityId}`,
			httpMethod: 'GET',
			pathParameters: { identityId: goodIdentityId },
		} as unknown as APIGatewayProxyEvent;

		const response = await benefitsIdentityIdHandler(requestEvent);

		expect(response.statusCode).toEqual(200);
		expect(getUserBenefitsExcludingStaff).toHaveBeenCalledWith(
			undefined, // stage isn't defined in tests and anything doesn't match undefined
			expect.anything(),
			goodIdentityId,
		);
	});
});
