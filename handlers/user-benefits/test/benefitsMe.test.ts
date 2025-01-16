import type { UserBenefitsResponse } from '@modules/product-benefits/schemas';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { benefitsMeHandler } from '../src/benefitsMe';

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

jest.mock('@modules/stage', () => ({
	stageFromEnvironment: () => 'CODE',
}));

const requestEvent = {
	path: '/benefits/me',
	httpMethod: 'GET',
	headers: {
		Authorization: 'Bearer good-token',
	},
} as unknown as APIGatewayProxyEvent;

describe('benefitsMeHandler', () => {
	it('returns a 200 with user benefits', async () => {
		const response = await benefitsMeHandler(requestEvent);
		expect(response.statusCode).toEqual(200);
		const parsedBody = JSON.parse(response.body) as UserBenefitsResponse;
		expect(parsedBody.benefits).toEqual(['adFree']);
	});
	it('returns CORS headers when the request is from an allowed origin', async () => {
		const corsEvent = {
			path: '/benefits/me',
			httpMethod: 'GET',
			headers: {
				Authorization: 'Bearer good-token',
				Origin: 'https://m.code.dev-theguardian.com',
			},
		} as unknown as APIGatewayProxyEvent;
		const response = await benefitsMeHandler(corsEvent);

		expect(response.statusCode).toEqual(200);
		expect(response.headers).toEqual(
			expect.objectContaining({
				'access-control-allow-origin': 'https://m.code.dev-theguardian.com',
				vary: 'Origin',
				'access-control-allow-headers': '*',
				'access-control-allow-methods': 'GET',
			}),
		);
	});
	it('does not return CORS headers when the origin header is missing', async () => {
		const response = await benefitsMeHandler(requestEvent);
		expect(response.statusCode).toEqual(200);
		expect(response.headers).toStrictEqual({
			'Cache-Control': 'private, no-store',
		});
	});
	it('does not return CORS headers when the origin header is not in the allowed list', async () => {
		const corsEvent = {
			path: '/benefits/me',
			httpMethod: 'GET',
			headers: {
				Authorization: 'Bearer good-token',
				Origin: 'https://not-allowed.com',
			},
		} as unknown as APIGatewayProxyEvent;
		const response = await benefitsMeHandler(corsEvent);
		expect(response.statusCode).toEqual(200);
		expect(response.headers).toStrictEqual({
			'Cache-Control': 'private, no-store',
		});
	});
});
