import { Logger } from '@modules/routing/logger';
import { z } from 'zod';
import {
	HttpError,
	RestRequestMaker,
} from '../../src/services/make-http-request';

const mockFetch = jest.fn();

describe('RestRequestMaker', () => {
	const baseURL = 'https://api.example.com';
	const headers = { Authorization: 'Bearer token123' };
	const restRequestMaker: RestRequestMaker = new RestRequestMaker(
		baseURL,
		headers,
		mockFetch,
		new Logger(),
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('successful requests', () => {
		it('should make a successful GET request with Zod schema', async () => {
			const responseData = { id: 1, name: 'Test' };
			const schema = z.object({ id: z.number(), name: z.string() });

			mockFetch.mockResolvedValueOnce(
				new Response(JSON.stringify(responseData), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				}),
			);

			const result = await restRequestMaker.makeRESTRequest(
				'GET',
				'/users/1',
				schema,
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(responseData);
			}
			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.example.com/users/1',
				{
					method: 'GET',
					headers: { Authorization: 'Bearer token123' },
					body: undefined,
				},
			);
		});

		it('should make a successful POST request with body', async () => {
			const requestBody = { name: 'New User' };
			const responseData = { id: 2, name: 'New User' };
			const schema = z.object({ id: z.number(), name: z.string() });

			mockFetch.mockResolvedValueOnce(
				new Response(JSON.stringify(responseData), {
					status: 201,
					headers: { 'content-type': 'application/json' },
				}),
			);

			const result = await restRequestMaker.makeRESTRequest(
				'POST',
				'/users',
				schema,
				requestBody,
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(responseData);
			}
			expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/users', {
				method: 'POST',
				headers: {
					Authorization: 'Bearer token123',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
			});
		});

		it('should handle function-based parsing for plain text responses', async () => {
			const responseText = 'plain text response';
			const parseFn = (body: string, contentType?: string) => ({
				content: body,
				type: contentType,
			});

			mockFetch.mockResolvedValueOnce(
				new Response(responseText, {
					status: 200,
					headers: { 'content-type': 'text/plain' },
				}),
			);

			const result = await restRequestMaker.makeRESTRequest(
				'GET',
				'/text',
				parseFn,
			);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual({
					content: responseText,
					type: 'text/plain',
				});
			}
		});
	});

	describe('error handling', () => {
		it('should throw for HTTP errors', async () => {
			const errorBody = { error: 'Not found' };
			mockFetch.mockResolvedValueOnce(
				new Response(JSON.stringify(errorBody), {
					status: 404,
					statusText: 'Not Found',
				}),
			);

			const schema = z.object({ id: z.number() });

			try {
				await restRequestMaker.makeRESTRequest('GET', '/users/999', schema);
				fail('test did not throw');
			} catch (error) {
				expect(error).toBeInstanceOf(HttpError);
				if (error instanceof HttpError) {
					expect(error.statusCode).toBe(404);
					expect(error.body).toEqual(errorBody);
				}
			}
		});

		it('should return unsuccessful for Zod parsing errors', async () => {
			const invalidResponse = { name: 'Test' }; // missing required 'id' field
			const schema = z.object({ id: z.number(), name: z.string() });

			mockFetch.mockResolvedValueOnce(
				new Response(JSON.stringify(invalidResponse), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				}),
			);

			const result = await restRequestMaker.makeRESTRequest(
				'GET',
				'/users/1',
				schema,
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBeInstanceOf(Error);
				expect(result.error.message).toContain('could not parse response');
			}
		});

		it('should return unsuccessful if json is expected (has zod schema) but content-type does not match', async () => {
			const schema = z.object({ id: z.number() });

			mockFetch.mockResolvedValueOnce(
				new Response('plain text', {
					status: 200,
					headers: { 'content-type': 'text/plain' },
				}),
			);

			const result = await restRequestMaker.makeRESTRequest(
				'GET',
				'/users/1',
				schema,
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBeInstanceOf(Error);
				expect((result.error.cause as Error).message).toContain(
					"response content-type wasn't JSON",
				);
			}
		});

		it('should return unsuccessful if malformed JSON is returned', async () => {
			const schema = z.object({ id: z.number() });

			mockFetch.mockResolvedValueOnce(
				new Response('invalid json{', {
					status: 200,
					headers: { 'content-type': 'application/json' },
				}),
			);

			const result = await restRequestMaker.makeRESTRequest(
				'GET',
				'/users/1',
				schema,
			);

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBeInstanceOf(Error);
				expect(result.error.message).toContain('could not parse response');
			}
		});

		it('should throw network errors', async () => {
			const schema = z.object({ id: z.number() });
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(
				restRequestMaker.makeRESTRequest('GET', '/users/1', schema),
			).rejects.toThrow('Network error');
		});
	});

	describe('extractErrorBody', () => {
		it('should include text error response in the exception', async () => {
			mockFetch.mockResolvedValueOnce(
				new Response('Server Error', {
					status: 500,
					statusText: 'Internal Server Error',
				}),
			);

			const schema = z.object({ id: z.number() });

			try {
				await restRequestMaker.makeRESTRequest('GET', '/users/1', schema);
			} catch (error) {
				expect(error).toBeInstanceOf(HttpError);
				if (error instanceof HttpError) {
					expect(error.body).toBe('Server Error');
				}
			}
		});

		it('should return undefined in case of an unreadable error body', async () => {
			const mockResponse = new Response('', { status: 500 });
			// Mock text() to throw an error
			jest
				.spyOn(mockResponse, 'text')
				.mockRejectedValueOnce(new Error('Cannot read'));
			mockFetch.mockResolvedValueOnce(mockResponse);

			const schema = z.object({ id: z.number() });

			try {
				await restRequestMaker.makeRESTRequest('GET', '/users/1', schema);
			} catch (error) {
				expect(error).toBeInstanceOf(HttpError);
				if (error instanceof HttpError) {
					expect(error.body).toBeUndefined();
				}
			}
		});
	});

	describe('HTTP methods', () => {
		const schema = z.object({ success: z.boolean() });

		it.each(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const)(
			'should handle %s method',
			async (method) => {
				mockFetch.mockResolvedValueOnce(
					new Response(JSON.stringify({ success: true }), {
						status: 200,
						headers: { 'content-type': 'application/json' },
					}),
				);

				const result = await restRequestMaker.makeRESTRequest(
					method,
					'/test',
					schema,
				);

				expect(result.success).toBe(true);
				expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/test', {
					method,
					headers: { Authorization: 'Bearer token123' },
					body: undefined,
				});
			},
		);
	});
});
