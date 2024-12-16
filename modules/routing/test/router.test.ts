import type { APIGatewayProxyEvent } from 'aws-lambda';
import type { HttpMethod } from '@modules/routing/router';
import { NotFoundResponse, Router } from '@modules/routing/router';

const successResponse = {
	body: 'Success',
	statusCode: 200,
};

const router = new Router([
	{
		httpMethod: 'GET',
		path: '/benefits/me',
		handler: () => {
			return Promise.resolve(successResponse);
		},
	},
]);

describe('Router', () => {
	test('it should match a route successfully', async () => {
		expect(
			await router.routeRequest(buildApiGatewayEvent('/benefits/me', 'GET')),
		).toEqual(successResponse);
	});
	test('it should return a 404 if no route is found', async () => {
		expect(
			await router.routeRequest(buildApiGatewayEvent('/not-found', 'GET')),
		).toEqual(NotFoundResponse);
	});
});

const buildApiGatewayEvent = (
	path: string,
	httpMethod: HttpMethod,
): APIGatewayProxyEvent => ({
	body: null,
	headers: {},
	multiValueHeaders: {},
	multiValueQueryStringParameters: null,
	httpMethod,
	isBase64Encoded: false,
	path,
	pathParameters: null,
	queryStringParameters: null,
	stageVariables: null,
	requestContext: {
		accountId: '',
		apiId: '',
		authorizer: null,
		httpMethod: 'GET',
		identity: {
			accessKey: null,
			accountId: null,
			apiKey: null,
			apiKeyId: null,
			caller: null,
			cognitoAuthenticationProvider: null,
			cognitoAuthenticationType: null,
			cognitoIdentityId: null,
			cognitoIdentityPoolId: null,
			principalOrgId: null,
			sourceIp: '',
			user: null,
			userAgent: null,
			userArn: null,
			clientCert: null,
		},
		path: '/benefits/me',
		protocol: '',
		requestId: '',
		requestTimeEpoch: 0,
		resourceId: '',
		resourcePath: '',
		stage: '',
	},
	resource: '',
});
