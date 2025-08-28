import type { APIGatewayProxyEvent } from 'aws-lambda';

// Simple mocks
const mockLogger = {
	log: jest.fn(),
	mutableAddContext: jest.fn(),
};

const mockRouterInstance = {
	routeRequest: jest.fn(),
};

jest.mock('@modules/logger', () => ({
	Logger: jest.fn(() => mockLogger),
}));

jest.mock('@modules/routing/router', () => ({
	Router: jest.fn(() => mockRouterInstance),
}));

jest.mock('../src/handlers', () => ({
	listenDisputeCreatedHandler: jest.fn(() =>
		jest.fn().mockResolvedValue({
			statusCode: 200,
			body: JSON.stringify({ success: true, disputeId: 'du_test123' }),
		}),
	),
	listenDisputeClosedHandler: jest.fn(() =>
		jest.fn().mockResolvedValue({
			statusCode: 200,
			body: JSON.stringify({
				message: 'Dispute closed',
				disputeId: 'du_test123',
			}),
		}),
	),
}));

// Import after mocks
import { handler } from '../src';

describe('Main Handler', () => {
	const createMockEvent = (
		path: string,
		httpMethod: string,
		body: string,
	): APIGatewayProxyEvent => ({
		body,
		headers: {},
		multiValueHeaders: {},
		httpMethod,
		path,
		pathParameters: null,
		queryStringParameters: null,
		multiValueQueryStringParameters: null,
		stageVariables: null,
		isBase64Encoded: false,
		requestContext: {
			accountId: 'test',
			apiId: 'test',
			protocol: 'HTTP/1.1',
			httpMethod,
			path,
			stage: 'test',
			requestId: 'test',
			requestTime: 'test',
			requestTimeEpoch: 123456789,
			identity: {
				cognitoIdentityPoolId: null,
				cognitoIdentityId: null,
				apiKey: null,
				principalOrgId: null,
				cognitoAuthenticationType: null,
				userArn: null,
				apiKeyId: null,
				userAgent: 'test',
				accountId: null,
				cognitoAuthenticationProvider: null,
				sourceIp: '127.0.0.1',
				accessKey: null,
				caller: null,
				clientCert: null,
				user: null,
			},
			resourceId: 'test',
			resourcePath: path,
			authorizer: {},
		},
		resource: path,
	});

	beforeEach(() => {
		jest.clearAllMocks();
		mockRouterInstance.routeRequest.mockResolvedValue({
			statusCode: 200,
			body: JSON.stringify({ success: true }),
		});
	});

	it('should route requests through router', async () => {
		const event = createMockEvent('/listen-dispute-created', 'POST', '{}');
		const result = await handler(event);

		expect(mockRouterInstance.routeRequest).toHaveBeenCalledWith(event);
		expect(result).toBeDefined();
	});

	it('should log input and output', async () => {
		const event = createMockEvent('/listen-dispute-created', 'POST', '{}');
		const mockResponse = {
			statusCode: 200,
			body: JSON.stringify({ success: true }),
		};
		mockRouterInstance.routeRequest.mockResolvedValue(mockResponse);

		const result = await handler(event);

		expect(mockLogger.log).toHaveBeenCalledWith(
			`Input: ${JSON.stringify(event)}`,
		);
		expect(mockLogger.log).toHaveBeenCalledWith(
			`Response: ${JSON.stringify(result)}`,
		);
	});
});
