import { createRoute, z } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import { ValidationError } from '@modules/errors';
import { logger } from '@modules/logger/logger';
import { createSrApi } from '../src/srApi';

const info = { title: 'Test API', description: 'Test API', version: '1.0.0' };

describe('SR API conventions', () => {
	let errorLog: jest.SpyInstance;

	beforeEach(() => {
		jest.spyOn(logger, 'log').mockImplementation(() => undefined);
		errorLog = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('serves generated OpenAPI without authentication', async () => {
		const app = createSrApi(info, []);
		const response = await app.request('/openapi.json');
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			openapi: '3.1.0',
			info,
			components: {
				securitySchemes: {
					apiKey: { type: 'apiKey', in: 'header', name: 'x-api-key' },
				},
			},
		});
	});

	it('serves the public explorer with direct requests and no stored credentials or telemetry', async () => {
		const app = createSrApi(info, []);
		const response = await app.request('/explorer');
		expect(response.status).toBe(200);
		const body = await response.text();
		expect(body).toContain('Scalar.createApiReference');
		expect(body).toContain("url: './openapi.json'");
		expect(body).toContain("proxyUrl: ''");
		expect(body).toContain('persistAuth: false');
		expect(body).toContain('telemetry: false');
	});

	it.each([
		['malformed JSON', { 'Content-Type': 'application/json' }, 'not json', 400],
		['empty JSON body', { 'Content-Type': 'application/json' }, '', 400],
		['missing content type', {}, '{}', 415],
		['unsupported content type', { 'Content-Type': 'text/plain' }, '{}', 415],
	])(
		'rejects %s before calling the handler',
		async (_name, headers, body, status) => {
			const handler = jest.fn(() => ({ ok: true }));
			const route = createRoute({
				method: 'post',
				path: '/items',
				request: {
					body: {
						required: true,
						content: { 'application/json': { schema: z.strictObject({}) } },
					},
				},
				responses: {
					200: {
						description: 'Success',
						content: {
							'application/json': { schema: z.object({ ok: z.boolean() }) },
						},
					},
				},
			});
			const app = createSrApi(info, [{ route, handler }]);
			const response = await app.request('/items', {
				method: 'POST',
				headers,
				body,
			});
			expect(response.status).toBe(status);
			expect(handler).not.toHaveBeenCalled();
		},
	);

	it('uses standard request traces without logging credential headers', async () => {
		const output = jest
			.spyOn(process.stdout, 'write')
			.mockImplementation(() => true);
		const app = createSrApi(info, []);
		app.get('/health', (c) => c.json({ ok: true }));
		const response = await app.request('/health', {
			headers: {
				'x-api-key': 'private-api-key',
				authorization: 'private-token',
			},
		});
		expect(response.status).toBe(200);
		const logs = output.mock.calls
			.map(([chunk]) =>
				typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'),
			)
			.join('');
		expect(logs).toContain('TRACE httpRequest ENTRY');
		expect(logs).toContain('TRACE httpRequest EXIT');
		expect(logs).toContain('GET /health');
		expect(logs).toContain('statusCode: 200');
		expect(logs).not.toContain('private-api-key');
		expect(logs).not.toContain('private-token');
	});

	it('passes parsed parameters to ordinary handlers and clears their logging context', async () => {
		const addContext = jest.spyOn(logger, 'mutableAddContext');
		const output = jest
			.spyOn(process.stdout, 'write')
			.mockImplementation(() => true);
		const route = createRoute({
			method: 'get',
			path: '/items/{itemId}',
			request: {
				params: z.object({ itemId: z.coerce.number().int().positive() }),
			},
			responses: {
				200: {
					description: 'Parsed item',
					content: {
						'application/json': {
							schema: z.object({ itemId: z.number() }),
						},
					},
				},
			},
		});
		const app = createSrApi(info, [
			{
				route,
				handler: ({ params }) => {
					logger.mutableAddContext(String(params.itemId));
					return params;
				},
			},
		]);

		const response = await app.request('/items/0012');
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ itemId: 12 });
		expect(addContext).toHaveBeenCalledWith('12');
		expect(
			output.mock.calls.some(
				([chunk]) =>
					typeof chunk === 'string' &&
					/^12 .*TRACE httpRequest EXIT/.test(chunk),
			),
		).toBe(true);
		expect(logger.getMessage('test', 'after request')).toBe(
			'[test] after request',
		);

		addContext.mockClear();
		const invalidResponse = await app.request('/items/invalid');
		expect(invalidResponse.status).toBe(400);
		expect(addContext).not.toHaveBeenCalled();
	});

	it('passes the parsed body to the handler only after all validation', async () => {
		const addContext = jest.spyOn(logger, 'mutableAddContext');
		const route = createRoute({
			method: 'post',
			path: '/items/{itemId}',
			request: {
				params: z.object({ itemId: z.string() }),
				body: {
					required: true,
					content: {
						'application/json': {
							schema: z.object({ reference: z.string().trim().min(1) }),
						},
					},
				},
			},
			responses: {
				200: {
					description: 'Success',
					content: {
						'application/json': {
							schema: z.strictObject({ ok: z.boolean() }),
						},
					},
				},
			},
		});
		const app = createSrApi(info, [
			{
				route,
				handler: ({ body }) => {
					logger.mutableAddContext(body.reference);
					return { ok: true };
				},
			},
		]);
		const response = await app.request('/items/not-the-context', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ reference: ' A-S12345678 ' }),
		});
		expect(response.status).toBe(200);
		expect(addContext).toHaveBeenCalledWith('A-S12345678');

		addContext.mockClear();
		const invalidResponse = await app.request('/items/not-the-context', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ reference: 123 }),
		});
		expect(invalidResponse.status).toBe(400);
		expect(addContext).not.toHaveBeenCalled();
	});

	it('does not add logging context implicitly', async () => {
		const addContext = jest.spyOn(logger, 'mutableAddContext');
		const route = createRoute({
			method: 'get',
			path: '/items/{itemId}',
			request: { params: z.object({ itemId: z.string() }) },
			responses: {
				200: {
					description: 'Success',
					content: {
						'application/json': {
							schema: z.strictObject({ ok: z.boolean() }),
						},
					},
				},
			},
		});
		const app = createSrApi(info, [{ route, handler: () => ({ ok: true }) }]);
		const response = await app.request('/items/A-S12345678');
		expect(response.status).toBe(200);
		expect(addContext).not.toHaveBeenCalled();
	});

	it('passes transformed inputs to async handlers and applies the response schema', async () => {
		const route = createRoute({
			method: 'post',
			path: '/items/{itemId}',
			request: {
				params: z.object({ itemId: z.coerce.number().int() }),
				headers: z.object({ 'x-label': z.string().trim() }),
				body: {
					required: true,
					content: {
						'application/json': {
							schema: z.object({
								reference: z
									.string()
									.trim()
									.transform((value) => value.length),
							}),
						},
					},
				},
			},
			responses: {
				200: {
					description: 'Parsed result',
					content: {
						'application/json': {
							schema: z.strictObject({
								itemId: z.number(),
								label: z.string(),
								length: z.number().transform((value) => value * 2),
								confirmed: z.boolean().default(true),
							}),
						},
					},
				},
			},
		});
		const app = createSrApi(info, [
			{
				route,
				handler: async ({ params, headers, body }) =>
					Promise.resolve({
						itemId: params.itemId,
						label: headers['x-label'],
						length: body.reference,
					}),
			},
		]);
		const response = await app.request('/items/0012', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'x-label': ' label ' },
			body: JSON.stringify({ reference: ' abc ' }),
		});
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			itemId: 12,
			label: 'label',
			length: 6,
			confirmed: true,
		});
	});

	it.each([{ ok: 'wrong type' }, { privateData: 'must not reach the client' }])(
		'logs and returns 500 for invalid handler output',
		async (mutation) => {
			const result = { ok: true };
			Object.assign(result, mutation);
			const route = createRoute({
				method: 'get',
				path: '/result',
				responses: {
					200: {
						description: 'Validated result',
						content: {
							'application/json': {
								schema: z.strictObject({ ok: z.boolean() }),
							},
						},
					},
				},
			});
			let errorContext = '';
			errorLog.mockImplementation(() => {
				errorContext = logger.getMessage('test', 'failed');
			});
			const app = createSrApi(info, [
				{
					route,
					handler: () => {
						logger.mutableAddContext('item-reference');
						return result;
					},
				},
			]);
			const response = await app.request('/result');
			expect(response.status).toBe(500);
			expect(await response.json()).toEqual({
				message: 'Internal server error',
			});
			expect(errorLog).toHaveBeenCalledTimes(1);
			expect(errorContext).toBe('item-reference [test] failed');
			expect(logger.getMessage('test', 'after request')).toBe(
				'[test] after request',
			);
		},
	);

	it('treats exceptions from async response validation as server errors', async () => {
		const app = createSrApi(info, [
			{
				route: createRoute({
					method: 'get',
					path: '/invalid-response',
					responses: {
						200: {
							description: 'Validated result',
							content: {
								'application/json': {
									schema: z
										.object({ ok: z.boolean() })
										.superRefine(async () => {
											await Promise.resolve();
											throw new ValidationError(
												'Private response validation failure',
											);
										}),
								},
							},
						},
					},
				}),
				handler: () => ({ ok: true }),
			},
		]);

		const response = await app.request('/invalid-response');

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ message: 'Internal server error' });
		expect(errorLog).toHaveBeenCalledTimes(1);
		expect(errorLog).toHaveBeenCalledWith(
			'API request failed',
			expect.objectContaining({ status: 500, message: 'Invalid API response' }),
		);
	});

	it.each([
		[new ValidationError('Unsupported product'), 400, 'Unsupported product'],
		[
			new HTTPException(415, { message: 'Unsupported Media Type' }),
			415,
			'Unsupported Media Type',
		],
		[new Error('Private implementation detail'), 500, 'Internal server error'],
	])(
		'maps errors without leaking unexpected details',
		async (error, status, message) => {
			const route = createRoute({
				method: 'get',
				path: '/failure',
				responses: {
					200: {
						description: 'Success',
						content: {
							'application/json': { schema: z.object({ ok: z.boolean() }) },
						},
					},
				},
			});
			const app = createSrApi(info, [
				{
					route,
					handler: () => {
						logger.mutableAddContext('failed-item');
						throw error;
					},
				},
			]);
			const response = await app.request('/failure');
			expect(response.status).toBe(status);
			expect(await response.json()).toEqual({ message });
			expect(logger.getMessage('test', 'after request')).toBe(
				'[test] after request',
			);
			if (status === 500) {
				expect(errorLog).toHaveBeenCalledWith('API request failed', error);
				expect(errorLog).toHaveBeenCalledTimes(1);
			}
		},
	);
});
