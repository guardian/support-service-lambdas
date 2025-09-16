import { BearerTokenProvider } from '@modules/zuora/auth';
import { ZuoraError } from '@modules/zuora/errors';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { z } from 'zod';

// Mock fetch globally
global.fetch = jest.fn();

// Mock the dependencies
jest.mock('../src/auth/oAuthCredentials', () => ({
	getOAuthClientCredentials: jest.fn().mockResolvedValue({
		client_id: 'test_client',
		client_secret: 'test_secret',
	}),
}));

jest.mock('../src/auth/bearerTokenProvider');
jest.mock('../src/utils', () => ({
	zuoraServerUrl: jest.fn(() => 'https://rest.apisandbox.zuora.com'),
}));

// Test schema for responses
const testSchema = z.object({
	success: z.boolean(),
});

describe('ZuoraClient fetch method error handling', () => {
	let zuoraClient: ZuoraClient;
	let mockTokenProvider: jest.Mocked<BearerTokenProvider>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockTokenProvider = {
			getBearerToken: jest
				.fn()
				.mockResolvedValue({ access_token: 'test_token' }),
		} as any;

		zuoraClient = new ZuoraClient('CODE', mockTokenProvider);
	});

	describe('HTTP 400 errors with different response formats', () => {
		test('should handle /v1/object/* error format with Errors array', async () => {
			const mockResponse = {
				ok: false,
				status: 400,
				statusText: 'Bad Request',
				json: jest.fn().mockResolvedValue({
					Errors: [
						{
							Message:
								'You cannot transfer an amount greater than the invoice balance. Please update and try again.',
							Code: 'INVALID_VALUE',
						},
					],
					Success: false,
				}),
			};

			(fetch as jest.Mock).mockResolvedValue(mockResponse);

			await expect(
				zuoraClient.fetch()(
					'v1/object/credit-balance-adjustment',
					'POST',
					testSchema,
				),
			).rejects.toThrow(ZuoraError);

			try {
				await zuoraClient.fetch()(
					'v1/object/credit-balance-adjustment',
					'POST',
					testSchema,
				);
			} catch (error) {
				expect(error).toBeInstanceOf(ZuoraError);
				expect((error as ZuoraError).message).toContain(
					'You cannot transfer an amount greater than the invoice balance',
				);
				expect((error as ZuoraError).message).toContain('INVALID_VALUE');
			}
		});

		test('should handle query action error format with FaultCode/FaultMessage', async () => {
			const mockResponse = {
				ok: false,
				status: 400,
				statusText: 'Bad Request',
				json: jest.fn().mockResolvedValue({
					FaultCode: 'INVALID_FIELD',
					FaultMessage: 'invalid field for query: Invoice.accountid1',
				}),
			};

			(fetch as jest.Mock).mockResolvedValue(mockResponse);

			await expect(
				zuoraClient.fetch()('v1/action/query', 'POST', testSchema),
			).rejects.toThrow(ZuoraError);

			try {
				await zuoraClient.fetch()('v1/action/query', 'POST', testSchema);
			} catch (error) {
				expect(error).toBeInstanceOf(ZuoraError);
				expect((error as ZuoraError).message).toContain(
					'invalid field for query: Invoice.accountid1',
				);
				expect((error as ZuoraError).message).toContain('INVALID_FIELD');
			}
		});

		test('should handle invalid action error format with code/message', async () => {
			const mockResponse = {
				ok: false,
				status: 400,
				statusText: 'Bad Request',
				json: jest.fn().mockResolvedValue({
					code: 'ClientError',
					message: "Invalid action 'query1'",
				}),
			};

			(fetch as jest.Mock).mockResolvedValue(mockResponse);

			await expect(
				zuoraClient.fetch()('v1/action/query1', 'POST', testSchema),
			).rejects.toThrow(ZuoraError);

			try {
				await zuoraClient.fetch()('v1/action/query1', 'POST', testSchema);
			} catch (error) {
				expect(error).toBeInstanceOf(ZuoraError);
				expect((error as ZuoraError).message).toContain(
					"Invalid action 'query1'",
				);
				expect((error as ZuoraError).message).toContain('ClientError');
			}
		});
	});

	describe('HTTP 401 errors', () => {
		test('should handle authentication error with reasons array', async () => {
			const mockResponse = {
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
				json: jest.fn().mockResolvedValue({
					success: false,
					reasons: [
						{
							code: '90000011',
							message: 'Authentication error',
						},
					],
				}),
			};

			(fetch as jest.Mock).mockResolvedValue(mockResponse);

			await expect(
				zuoraClient.fetch()(
					'v1/object/credit-balance-adjustment',
					'POST',
					testSchema,
				),
			).rejects.toThrow(ZuoraError);

			try {
				await zuoraClient.fetch()(
					'v1/object/credit-balance-adjustment',
					'POST',
					testSchema,
				);
			} catch (error) {
				expect(error).toBeInstanceOf(ZuoraError);
				expect((error as ZuoraError).message).toContain('Authentication error');
				expect((error as ZuoraError).message).toContain('90000011');
			}
		});
	});

	describe('HTTP 200 responses with success: false', () => {
		test('should handle account not found error (HTTP 200 but success: false)', async () => {
			const mockResponse = {
				ok: true, // Zuora responds with HTTP 200 but logical error exists
				status: 200,
				statusText: 'OK',
				json: jest.fn().mockResolvedValue({
					success: false,
					processId: '8CF944C78E50988F',
					reasons: [
						{
							code: 50000040,
							message: "Cannot find entity by key: 'xxx'.",
						},
					],
					requestId: 'dd76fba7-330c-4b7f-ad08-bc42fa69bf3e',
				}),
			};

			(fetch as jest.Mock).mockResolvedValue(mockResponse);

			await expect(
				zuoraClient.fetch()(
					'v1/accounts/xxx/payment-methods',
					'GET',
					testSchema,
				),
			).rejects.toThrow();
		});

		test('should handle invalid endpoint error (HTTP 200 but success: false)', async () => {
			const mockResponse = {
				ok: true, // Zuora responds with HTTP 200 but logical error exists
				status: 200,
				statusText: 'OK',
				json: jest.fn().mockResolvedValue({
					success: false,
					processId: '0D252DA3B536A5E4',
					reasons: [
						{
							code: 50000040,
							message:
								'The endpoint /v1/accounts/8ad09b7d83a313110183a8769afd1bf3/payment-methods1 does not exist. Please check the URL or refer to the API documentation.',
						},
					],
					requestId: 'e0f3c178-4369-4d0f-9d60-8a9c23d5a0f4',
				}),
			};

			(fetch as jest.Mock).mockResolvedValue(mockResponse);
			await expect(
				zuoraClient.fetch()(
					'v1/accounts/8ad09b7d83a313110183a8769afd1bf3/payment-methods-invalid-endpoint',
					'GET',
					testSchema,
				),
			).rejects.toThrow();
		});
	});

	describe('Rate limiting (HTTP 429)', () => {
		test('should handle rate limiting with enhanced error information', async () => {
			const mockResponse = {
				ok: false,
				status: 429,
				statusText: 'Too Many Requests',
				headers: new Map([
					['retry-after', '60'],
					['x-ratelimit-limit', '1000'],
					['x-ratelimit-remaining', '0'],
				]),
				json: jest.fn().mockResolvedValue({
					success: false,
					code: 'RATE_LIMIT_EXCEEDED',
					message: 'Rate limit exceeded',
				}),
			};

			(fetch as jest.Mock).mockResolvedValue(mockResponse);

			await expect(
				zuoraClient.fetch()(
					'v1/accounts/test/payment-methods',
					'GET',
					testSchema,
				),
			).rejects.toThrow(ZuoraError);

			try {
				await zuoraClient.fetch()(
					'v1/accounts/test/payment-methods',
					'GET',
					testSchema,
				);
			} catch (error) {
				expect(error).toBeInstanceOf(ZuoraError);
				expect((error as ZuoraError).code).toBe(429);
				expect((error as ZuoraError).message).toContain('Rate limit exceeded');
			}
		});
	});

	describe('Successful responses', () => {
		test('should handle successful responses with success: true', async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				json: jest.fn().mockResolvedValue({
					success: true,
				}),
			};

			(fetch as jest.Mock).mockResolvedValue(mockResponse);

			const result = await zuoraClient.fetch()(
				'v1/accounts/test/payment-methods',
				'GET',
				testSchema,
			);
			expect(result).toEqual({ success: true });
		});
	});
});
