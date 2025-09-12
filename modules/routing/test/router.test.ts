import type { APIGatewayProxyEvent } from 'aws-lambda';
import { z } from 'zod';
import type { HttpMethod } from '@modules/routing/router';
import { createRoute, NotFoundResponse, Router } from '@modules/routing/router';

const successResponse = {
	body: 'Success',
	statusCode: 200,
};

const router = Router([
	{
		httpMethod: 'GET',
		path: '/benefits/me',
		handler: () => {
			return Promise.resolve(successResponse);
		},
	},
	createRoute({
		httpMethod: 'POST',
		path: '/benefits/{benefitId}/users',
		parser: {
			path: z.object({
				benefitId: z.string(),
			}),
		},
		handler: (logger, event, parsed) => {
			return Promise.resolve({
				statusCode: 200,
				body: JSON.stringify(parsed),
			});
		},
	}),
	createRoute({
		httpMethod: 'PATCH',
		path: '/benefits/enabled/{flag}',
		handler: (logger, event, parsed) => {
			return Promise.resolve({
				statusCode: 200,
				body: JSON.stringify(parsed),
			});
		},
		parser: {
			path: z.object({
				flag: z.enum(['on', 'off']),
			}),
		},
	}),
	createRoute({
		httpMethod: 'POST',
		path: '/benefits',
		handler: (logger, event, parsed) => {
			return Promise.resolve({
				statusCode: 200,
				body: JSON.stringify(parsed),
			});
		},
		parser: {
			body: z.object({
				name: z.string(),
				age: z.number(),
				isActive: z.boolean(),
			}),
		},
	}),
	createRoute({
		httpMethod: 'PUT',
		path: '/benefits/{benefitId}',
		handler: (logger, event, parsed) => {
			return Promise.resolve({
				statusCode: 200,
				body: JSON.stringify(parsed),
			});
		},
		parser: {
			path: z.object({
				benefitId: z.string(),
			}),
			body: z.object({
				name: z.string(),
				age: z.number(),
				isActive: z.boolean(),
			}),
		},
	}),
]);

describe('Router', () => {
	test('it should match a route successfully', async () => {
		expect(await router(buildApiGatewayEvent('/benefits/me', 'GET'))).toEqual(
			successResponse,
		);
	});
	test('it should return a 404 if no route is found', async () => {
		expect(await router(buildApiGatewayEvent('/not-found', 'GET'))).toEqual(
			NotFoundResponse,
		);
	});
	test('it should check the http method as well as the path', async () => {
		expect(await router(buildApiGatewayEvent('/benefits/me', 'POST'))).toEqual(
			NotFoundResponse,
		);
	});
	test('it should accept path params', async () => {
		const benefitId = '123';
		const response = await router(
			buildApiGatewayEvent(`/benefits/${benefitId}/users`, 'POST'),
		);
		expect(response.statusCode).toEqual(200);
		const payload = JSON.parse(response.body) as {
			path: {
				benefitId: string;
			};
		};
		expect(payload.path.benefitId).toEqual(benefitId);
	});
	test('it should validate the path params', async () => {
		const response = await router(
			buildApiGatewayEvent(`/benefits/enabled/on`, 'PATCH'),
		);
		expect(response.statusCode).toEqual(200);
		const payload = JSON.parse(response.body) as {
			path: {
				flag: string;
			};
		};
		expect(payload.path.flag).toEqual('on');
	});
	test('it should validate the body payload', async () => {
		const request = {
			name: 'Benefit 1',
			age: 1,
			isActive: true,
		};
		const response = await router(
			buildApiGatewayEvent(`/benefits`, 'POST', JSON.stringify(request)),
		);
		expect(response.statusCode).toEqual(200);
		const payload = JSON.parse(response.body) as {
			body: {
				name: string;
				age: number;
				isActive: boolean;
			};
		};
		expect(payload.body.name).toEqual(request.name);
		expect(payload.body.age).toEqual(request.age);
		expect(payload.body.isActive).toEqual(request.isActive);
	});
	test('it should validate invalid path params and body payload', async () => {
		const benefitId = '123';
		const request = {
			name: 123,
			age: '2',
			isActive: 'yes',
		};
		const response = await router(
			buildApiGatewayEvent(
				`/benefits/${benefitId}`,
				'PUT',
				JSON.stringify(request),
			),
		);
		expect(response.statusCode).toEqual(400);
		const payload = JSON.parse(response.body) as {
			error: string;
			details: Array<{
				code: string;
				expected: string;
				received: string;
				path: unknown[];
				message: string;
			}>;
		};
		expect(payload.error).toEqual('Invalid request');
		expect(payload.details[0]?.message).toEqual(
			'Expected string, received number',
		);
		expect(payload.details[1]?.message).toEqual(
			'Expected number, received string',
		);
		expect(payload.details[2]?.message).toEqual(
			'Expected boolean, received string',
		);
	});
});

const buildApiGatewayEvent = (
	path: string,
	httpMethod: HttpMethod,
	body?: string,
): APIGatewayProxyEvent => ({
	body: body ?? null,
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
