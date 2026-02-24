import { BrazeClient, deleteBrazeUser } from '../../src/services/brazeClient';
import { HttpError } from '../../src/services/make-http-request';

// Mock the logger
jest.mock('@modules/routing/logger', () => ({
	logger: {
		log: jest.fn(),
		error: jest.fn(),
		getCallerInfo: jest.fn(() => 'brazeClient.test.ts'),
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- Mock wrapper
		wrapFn: jest.fn((fn) => fn),
	},
}));

const mockFetch = jest.fn();

// Mock global fetch
global.fetch = mockFetch;

describe('BrazeClient', () => {
	const apiUrl = 'https://rest.iad-01.braze.com';
	const apiKey = 'test-api-key-123';
	const userId = 'test-user-456';

	beforeEach(() => {
		jest.clearAllMocks();
		console.log = jest.fn();
		console.error = jest.fn();
	});

	describe('deleteBrazeUser', () => {
		describe('Successful deletions', () => {
			it('should return success when user is deleted', async () => {
				mockFetch.mockResolvedValue(
					new Response(JSON.stringify({ deleted: 1 }), {
						status: 200,
						headers: { 'content-type': 'application/json' },
					}),
				);

				const client = new BrazeClient(apiUrl, apiKey);
				const result = await deleteBrazeUser(client, userId);

				expect(result).toEqual({ success: true });
			});

			it('should return success when deleted count is 1', async () => {
				mockFetch.mockResolvedValue(
					new Response(
						JSON.stringify({ deleted: 1, message: 'User deleted' }),
						{
							status: 200,
							headers: { 'content-type': 'application/json' },
						},
					),
				);

				const client = new BrazeClient(apiUrl, apiKey);
				const result = await deleteBrazeUser(client, userId);

				expect(result.success).toBe(true);
			});
		});

		describe('Idempotent deletions (404 handling)', () => {
			it('should treat 404 response as success', async () => {
				mockFetch.mockResolvedValue(
					new Response(JSON.stringify({ message: 'User not found' }), {
						status: 404,
						statusText: 'Not Found',
						headers: { 'content-type': 'application/json' },
					}),
				);

				const client = new BrazeClient(apiUrl, apiKey);
				const result = await deleteBrazeUser(client, userId);

				expect(result).toEqual({ success: true });
			});

			it('should treat deleted=0 response as success', async () => {
				mockFetch.mockResolvedValue(
					new Response(JSON.stringify({ deleted: 0 }), {
						status: 200,
						statusText: 'OK',
						headers: { 'content-type': 'application/json' },
					}),
				);

				const client = new BrazeClient(apiUrl, apiKey);
				const result = await deleteBrazeUser(client, userId);

				expect(result).toEqual({ success: true });
			});
		});

		describe('Retryable errors (5xx)', () => {
			it('should mark 500 errors as retryable', async () => {
				mockFetch.mockResolvedValue(
					new Response(JSON.stringify({ message: 'Server error' }), {
						status: 500,
						statusText: 'Internal Server Error',
						headers: { 'content-type': 'application/json' },
					}),
				);

				const client = new BrazeClient(apiUrl, apiKey);
				const result = await deleteBrazeUser(client, userId);

				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.retryable).toBe(true);
					expect(result.error).toBeInstanceOf(HttpError);
				}
			});

			it('should mark 503 errors as retryable', async () => {
				mockFetch.mockResolvedValue(
					new Response(
						JSON.stringify({ message: 'Service temporarily unavailable' }),
						{
							status: 503,
							statusText: 'Service Unavailable',
							headers: { 'content-type': 'application/json' },
						},
					),
				);

				const client = new BrazeClient(apiUrl, apiKey);
				const result = await deleteBrazeUser(client, userId);

				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.retryable).toBe(true);
				}
			});
		});

		describe('Non-retryable errors (4xx)', () => {
			it('should mark 400 errors as non-retryable', async () => {
				mockFetch.mockResolvedValue(
					new Response(JSON.stringify({ message: 'Invalid request' }), {
						status: 400,
						statusText: 'Bad Request',
						headers: { 'content-type': 'application/json' },
					}),
				);

				const client = new BrazeClient(apiUrl, apiKey);
				const result = await deleteBrazeUser(client, userId);

				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.retryable).toBe(false);
					expect(result.error).toBeInstanceOf(HttpError);
				}
			});

			it('should mark 401 errors as non-retryable', async () => {
				mockFetch.mockResolvedValue(
					new Response(JSON.stringify({ message: 'Invalid API key' }), {
						status: 401,
						statusText: 'Unauthorized',
						headers: { 'content-type': 'application/json' },
					}),
				);

				const client = new BrazeClient(apiUrl, apiKey);
				const result = await deleteBrazeUser(client, userId);

				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.retryable).toBe(false);
				}
			});

			it('should mark 403 errors as non-retryable', async () => {
				mockFetch.mockResolvedValue(
					new Response(JSON.stringify({ message: 'Access denied' }), {
						status: 403,
						statusText: 'Forbidden',
						headers: { 'content-type': 'application/json' },
					}),
				);

				const client = new BrazeClient(apiUrl, apiKey);
				const result = await deleteBrazeUser(client, userId);

				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.retryable).toBe(false);
				}
			});
		});

		describe('Network and unexpected errors', () => {
			it('should mark network errors as retryable', async () => {
				const networkError = new Error('Network timeout');
				mockFetch.mockRejectedValue(networkError);

				const client = new BrazeClient(apiUrl, apiKey);
				const result = await deleteBrazeUser(client, userId);

				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.retryable).toBe(true);
				}
			});

			it('should mark unexpected exceptions as retryable', async () => {
				const unexpectedError = new Error('Unexpected error');
				mockFetch.mockRejectedValue(unexpectedError);

				const client = new BrazeClient(apiUrl, apiKey);
				const result = await deleteBrazeUser(client, userId);

				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.retryable).toBe(true);
				}
			});

			it('should handle non-Error exceptions', async () => {
				mockFetch.mockRejectedValue('String error');

				const client = new BrazeClient(apiUrl, apiKey);
				const result = await deleteBrazeUser(client, userId);

				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.retryable).toBe(true);
					expect(result.error).toBeInstanceOf(Error);
					expect(result.error.message).toBe('String error');
				}
			});
		});
	});
});
