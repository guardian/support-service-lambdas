import type { UserBenefitsResponse } from '@modules/product-benefits/schemas';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../src/index';

jest.mock('@modules/identity/apiGateway', () => ({
	buildAuthenticate: () => (event: APIGatewayProxyEvent) => {
		if (event.headers.Authorization === 'Bearer good-token') {
			return {
				type: 'AuthenticatedApiGatewayEvent',
				userDetails: {
					identityId: 'good-identity-id',
					email: 'email@example.com',
				},
			};
		} else {
			return {
				type: 'FailedAuthenticationResponse',
				statusCode: 401,
			};
		}
	},
}));
jest.mock('@modules/product-catalog/api', () => ({
	getProductCatalogFromApi: () => ({}),
}));
jest.mock('@modules/product-benefits/userBenefits', () => ({
	getUserBenefits: () => ['adFree'],
}));

describe('handler', () => {
	it('returns a 404 for an unrecognized path or HTTP method', async () => {
		const requestEvent = {
			path: '/bad/path',
			httpMethod: 'GET',
			headers: {},
		} as unknown as APIGatewayProxyEvent;

		const response = await handler(requestEvent);

		expect(response.statusCode).toEqual(404);
	});

	describe('/benefits/me', () => {
		it('returns a 200 with user benefits', async () => {
			const requestEvent = {
				path: '/benefits/me',
				httpMethod: 'GET',
				headers: {
					Authorization: 'Bearer good-token',
				},
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);

			expect(response.statusCode).toEqual(200);
			const parsedBody = JSON.parse(response.body) as UserBenefitsResponse;
			expect(parsedBody.benefits).toEqual(['adFree']);
		});
	});
});
