import type { APIGatewayProxyEvent } from 'aws-lambda';

// Mock all dependencies before importing anything
const mockLogger = {
	log: jest.fn(),
	mutableAddContext: jest.fn(),
};

const mockRouterInstance = {
	routeRequest: jest.fn(),
};

jest.mock('@modules/logger', () => ({
	Logger: jest.fn().mockImplementation(() => mockLogger),
}));

jest.mock('@modules/routing/router', () => ({
	Router: jest.fn().mockImplementation(() => mockRouterInstance),
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

// Now import the handler after mocks are set up
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
		requestContext: {} as any,
		resource: '',
	});

	beforeEach(() => {
		jest.clearAllMocks();
		mockRouterInstance.routeRequest.mockResolvedValue({
			statusCode: 200,
			body: JSON.stringify({ success: true }),
		});
	});

	describe('Main Lambda Handler', () => {
		it('should route dispute created requests correctly', async () => {
			const event = createMockEvent('/listen-dispute-created', 'POST', '{}');
			mockRouterInstance.routeRequest.mockResolvedValue({
				statusCode: 200,
				body: JSON.stringify({ success: true, disputeId: 'du_test123' }),
			});

			const result = await handler(event);

			expect(result.statusCode).toBe(200);
			const responseBody = JSON.parse(result.body);
			expect(responseBody.success).toBe(true);
			expect(responseBody.disputeId).toBe('du_test123');
		});

		it('should route dispute closed requests correctly', async () => {
			const event = createMockEvent('/listen-dispute-closed', 'POST', '{}');
			mockRouterInstance.routeRequest.mockResolvedValue({
				statusCode: 200,
				body: JSON.stringify({
					message: 'Dispute closed',
					disputeId: 'du_test123',
				}),
			});

			const result = await handler(event);

			expect(result.statusCode).toBe(200);
			const responseBody = JSON.parse(result.body);
			expect(responseBody.message).toBe('Dispute closed');
			expect(responseBody.disputeId).toBe('du_test123');
		});

		it('should return 404 for unknown paths', async () => {
			const event = createMockEvent('/unknown-path', 'POST', '{}');
			mockRouterInstance.routeRequest.mockResolvedValue({
				statusCode: 404,
				body: JSON.stringify({ error: 'Not Found' }),
			});

			const result = await handler(event);

			expect(result.statusCode).toBe(404);
			const responseBody = JSON.parse(result.body);
			expect(responseBody.error).toBe('Not Found');
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
				`Input is ${JSON.stringify(event)}`,
			);
			expect(mockLogger.log).toHaveBeenCalledWith(
				`Response is ${JSON.stringify(result)}`,
			);
		});

		it('should call routeRequest with the event', async () => {
			const event = createMockEvent('/listen-dispute-created', 'POST', '{}');
			await handler(event);

			expect(mockRouterInstance.routeRequest).toHaveBeenCalledWith(event);
		});
	});

	describe('Error Handling', () => {
		it('should handle router errors gracefully', async () => {
			const event = createMockEvent('/listen-dispute-created', 'POST', '{}');
			mockRouterInstance.routeRequest.mockRejectedValue(
				new Error('Router error'),
			);

			// The handler should propagate router errors
			await expect(handler(event)).rejects.toThrow('Router error');
		});
	});
});
