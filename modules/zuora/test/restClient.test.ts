import { z, ZodError } from 'zod';
import { RestClient, RestClientError } from '../src/restClient';

class TestRestClient extends RestClient {
	constructor(
		baseUrl: string,
		private authHeaders: Record<string, string> = {},
	) {
		super(baseUrl);
	}

	protected getAuthHeaders: () => Promise<Record<string, string>> = () => {
		return Promise.resolve(this.authHeaders);
	};
}

describe('RestClient', () => {
	const mockBaseUrl = 'https://api.example.com';
	let client: TestRestClient;
	let fetchMock: jest.MockedFunction<typeof fetch>;

	const mockFetchResponse = (
		overrides: Partial<{
			ok: boolean;
			status: number;
			body: unknown;
			text: string;
			headers: Record<string, string>;
		}> = {},
	) => {
		const { ok = true, status = 200, body, headers = {}, text } = overrides;

		fetchMock.mockResolvedValue({
			ok,
			status,
			text: async () => Promise.resolve(body ? JSON.stringify(body) : text),
			headers: new Headers(headers),
		} as Response);
	};

	beforeEach(() => {
		client = new TestRestClient(mockBaseUrl);
		fetchMock = jest.fn();
		global.fetch = fetchMock;
	});

	describe('get', () => {
		it('should make a GET request and parse response', async () => {
			const schema = z.object({ id: z.string(), name: z.string() });
			const mockResponse = { id: '123', name: 'Test' };

			mockFetchResponse({
				ok: true,
				status: 200,
				body: mockResponse,
				headers: {},
			});

			const result = await client.get('/users/123', schema);

			expect(result).toEqual(mockResponse);
			expect(fetchMock).toHaveBeenCalledWith(
				`${mockBaseUrl}/users/123`,
				expect.objectContaining({ method: 'GET' }),
			);
		});
	});

	describe('post', () => {
		it('should make a POST request with body', async () => {
			const schema = z.object({ success: z.boolean() });
			const requestBody = JSON.stringify({ data: 'test' });
			const mockResponse = { success: true };

			mockFetchResponse({
				ok: true,
				status: 200,
				body: mockResponse,
				headers: {},
			});

			const result = await client.post('/users', requestBody, schema);

			expect(result).toEqual(mockResponse);
			expect(fetchMock).toHaveBeenCalledWith(
				`${mockBaseUrl}/users`,
				expect.objectContaining({
					method: 'POST',
					body: requestBody,
				}),
			);
		});

		it('should include custom headers', async () => {
			const schema = z.object({ success: z.boolean() });
			const customHeaders = { 'X-Custom-Header': 'value' };

			mockFetchResponse({
				ok: true,
				status: 200,
				body: { success: true },
				headers: {},
			});

			await client.post('/users', '{}', schema, customHeaders);

			expect(fetchMock).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- any is ok in a test
					headers: expect.objectContaining(customHeaders),
				}),
			);
		});
	});

	describe('getRaw', () => {
		it('should return raw response without parsing', async () => {
			const responseBody = '<html>HELLO</html>';

			mockFetchResponse({
				ok: true,
				status: 200,
				text: responseBody,
				headers: { 'content-type': 'text/html' },
			});

			const result = await client.getRaw('/index.html');

			expect(result.responseBody).toBe(responseBody);
			expect(result.responseHeaders).toHaveProperty('content-type');
		});
	});

	describe('error handling', () => {
		it('should throw RestClientError on HTTP error', async () => {
			const schema = z.object({ id: z.string() });

			const errorBody = { error: 'Not found' };
			const headers: Record<string, string> = { 'x-request-id': 'abc123' };
			mockFetchResponse({
				ok: false,
				status: 404,
				body: errorBody,
				headers: headers,
			});

			await expect(client.get('/users/999', schema)).rejects.toMatchObject({
				name: 'RestClientError',
				message: 'http call failed',
				statusCode: 404,
				responseBody: JSON.stringify(errorBody),
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- any is ok in a test
				responseHeaders: expect.objectContaining({ 'x-request-id': 'abc123' }),
			});
		});

		it('should throw error when schema validation fails', async () => {
			const schema = z.object({ id: z.string() });

			mockFetchResponse({
				ok: true,
				status: 200,
				body: { id: 123 },
				headers: {},
			});

			await expect(client.get('/users/123', schema)).rejects.toThrow(ZodError);
		});

		it('should use assertValidResponse to throw custom errors', async () => {
			const customError = new Error('Custom error');
			client['assertValidResponse'] = () => {
				throw customError;
			};

			mockFetchResponse({
				ok: false,
				status: 500,
				text: 'Internal error',
				headers: {},
			});

			await expect(client.getRaw('/error')).rejects.toThrow('Custom error');
		});

		it('should use assertValidResponse to determine logical failure', async () => {
			const schema = z.object({ status: z.string(), data: z.string() });
			client['assertValidResponse'] = (ok, result) => {
				const json = JSON.parse(result.responseBody) as { status: string };
				if (json.status !== 'success') {
					throw new RestClientError(
						'Logical failure',
						result.statusCode,
						result.responseBody,
						result.responseHeaders,
					);
				}
			};

			mockFetchResponse({
				ok: true,
				status: 200,
				body: { status: 'failed', data: 'error details' },
				headers: {},
			});

			await expect(client.get('/logical-fail', schema)).rejects.toThrow(
				RestClientError,
			);
		});
	});

	describe('authentication', () => {
		it('should include auth headers in requests', async () => {
			const authHeaders = { Authorization: 'Bearer token123' };
			const clientWithAuth = new TestRestClient(mockBaseUrl, authHeaders);
			const schema = z.object({ data: z.string() });

			mockFetchResponse({
				ok: true,
				status: 200,
				body: { data: 'test' },
				headers: {},
			});

			await clientWithAuth.get('/secure', schema);

			expect(fetchMock).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- any is ok in a test
					headers: expect.objectContaining(authHeaders),
				}),
			);
		});
	});

	describe('path handling', () => {
		it('should handle paths with leading slash', async () => {
			const schema = z.object({ data: z.string() });

			mockFetchResponse({
				ok: true,
				status: 200,
				body: { data: 'test' },
				headers: {},
			});

			await client.get('/path/to/resource', schema);

			expect(fetchMock).toHaveBeenCalledWith(
				`${mockBaseUrl}/path/to/resource`,
				expect.any(Object),
			);
		});

		it('should handle paths without leading slash', async () => {
			const schema = z.object({ data: z.string() });

			mockFetchResponse({
				ok: true,
				status: 200,
				body: { data: 'test' },
				headers: {},
			});

			await client.get('path/to/resource', schema);

			expect(fetchMock).toHaveBeenCalledWith(
				`${mockBaseUrl}/path/to/resource`,
				expect.any(Object),
			);
		});
	});
});
