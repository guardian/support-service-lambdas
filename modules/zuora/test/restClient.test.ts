import { z, ZodError } from 'zod';
import type { Authorisation, BearerTokenProvider } from '@modules/zuora/auth';
import { RestClient, RestClientError } from '../src/restClient';

class TestRestClient extends RestClient {
	constructor(baseUrl: string, authHeaders: Record<string, string> = {}) {
		const mockTokenProvider = {
			getAuthorisation: jest
				.fn()
				.mockResolvedValue({ baseUrl, authHeaders } satisfies Authorisation),
		} as unknown as jest.Mocked<BearerTokenProvider>;

		super(mockTokenProvider);
	}
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

		it('should preserve response status and support a raw response parser', async () => {
			mockFetchResponse({
				ok: true,
				status: 202,
				text: 'accepted',
				headers: { 'content-type': 'text/plain; charset=utf-8' },
			});

			const result = await client.getWithStatus(
				'/users/123',
				(body, contentType) => ({ body, contentType }),
			);

			expect(result).toEqual({
				status: 202,
				responseBody: { body: 'accepted', contentType: 'text/plain' },
				responseHeaders: { 'content-type': 'text/plain; charset=utf-8' },
				statusText: undefined,
			});
		});

		it('should support an empty response body with a raw response parser', async () => {
			mockFetchResponse({ ok: true, status: 204, text: '', headers: {} });

			const result = await client.getWithStatus('/users/123', () => undefined);

			expect(result.status).toBe(204);
			expect(result.responseBody).toBeUndefined();
		});

		it('should make a GET request with URLSearchParams including duplicate keys', async () => {
			const schema = z.object({ id: z.string(), name: z.string() });
			const mockResponse = { id: '456', name: 'Test2' };

			mockFetchResponse({
				ok: true,
				status: 200,
				body: mockResponse,
				headers: {},
			});

			const params = new URLSearchParams();
			params.append('pageSize', '99');
			params.append('fields[]', 'id');
			params.append('fields[]', 'name');

			const result = await client.get('/users', schema, params);

			expect(result).toEqual(mockResponse);
			expect(fetchMock).toHaveBeenCalledWith(
				`${mockBaseUrl}/users?pageSize=99&fields%5B%5D=id&fields%5B%5D=name`,
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

		it('should preserve response status for a POST request', async () => {
			mockFetchResponse({
				ok: true,
				status: 202,
				text: '',
				headers: {},
			});

			const result = await client.postWithStatus(
				'/users',
				JSON.stringify({ data: 'test' }),
				() => undefined,
			);

			expect(result.status).toBe(202);
			expect(result.responseBody).toBeUndefined();
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
				message: 'http call failed: 404',
				status: 404,
				responseBody: errorBody,
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

			try {
				await client.get('/users/123', schema);
			} catch (err) {
				expect(err).toBeInstanceOf(RestClientError);
				expect((err as Error).cause).toBeInstanceOf(ZodError);
			}
		});

		it('should throw a safe network error when fetch fails', async () => {
			fetchMock.mockRejectedValue(
				new Error('connection details should be hidden'),
			);

			await expect(
				client.get('/users/123', z.object({ id: z.string() })),
			).rejects.toMatchObject({
				name: 'RestClientNetworkError',
				message: 'REST request failed at the network layer',
			});
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

		it('should avoid duplicate slashes when the base URL has a trailing slash', async () => {
			const clientWithTrailingSlash = new TestRestClient(`${mockBaseUrl}/`);
			const schema = z.object({ data: z.string() });

			mockFetchResponse({
				ok: true,
				status: 200,
				body: { data: 'test' },
				headers: {},
			});

			await clientWithTrailingSlash.get('/path/to/resource', schema);

			expect(fetchMock).toHaveBeenCalledWith(
				`${mockBaseUrl}/path/to/resource`,
				expect.any(Object),
			);
		});
	});

	describe('streaming', () => {
		it('should return an unconsumed response body stream', async () => {
			const stream = new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(new TextEncoder().encode('stream body'));
					controller.close();
				},
			});
			fetchMock.mockResolvedValue({
				ok: true,
				status: 200,
				body: stream,
				headers: new Headers(),
			} as Response);

			const responseBody = await client.getStream('/stream');

			expect(await new Response(responseBody).text()).toBe('stream body');
		});

		it('should reject when a successful response has no body', async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				status: 204,
				body: null,
				headers: new Headers(),
			} as Response);

			await expect(client.getStream('/stream')).rejects.toThrow(
				'no http response body',
			);
		});
	});
});
