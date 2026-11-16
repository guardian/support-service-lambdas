import { createRoute, z } from '@hono/zod-openapi';
import { HTTPException } from 'hono/http-exception';
import { ValidationError } from '@modules/errors';
import { logger } from '@modules/logger/logger';
import { createSrApi, defineSrRoute } from '../src/srApi';

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

	it('passes parsed Zod parameters to the handler and logging context, then clears it', async () => {
		const addContext = jest.spyOn(logger, 'mutableAddContext');
		const app = createSrApi(info, [
			defineSrRoute({
				route: createRoute({
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
				}),
				logContext: ({ params }) => String(params.itemId),
				handler: ({ params }) => params,
			}),
		]);

		const response = await app.request('/items/0012');
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ itemId: 12 });
		expect(addContext).toHaveBeenCalledWith('12');
		expect(logger.getMessage('test', 'after request')).toBe(
			'[test] after request',
		);

		addContext.mockClear();
		const invalidResponse = await app.request('/items/invalid');
		expect(invalidResponse.status).toBe(400);
		expect(addContext).not.toHaveBeenCalled();
	});

	it('allows an endpoint to select context from the parsed body after all validation', async () => {
		const addContext = jest.spyOn(logger, 'mutableAddContext');
		const app = createSrApi(info, [
			defineSrRoute({
				route: createRoute({
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
				}),
				logContext: ({ body }) => body.reference,
				handler: () => ({ ok: true }),
			}),
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

	it('does not infer context when an endpoint explicitly disables the extractor', async () => {
		const addContext = jest.spyOn(logger, 'mutableAddContext');
		const app = createSrApi(info, [
			defineSrRoute({
				route: createRoute({
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
				}),
				logContext: undefined,
				handler: () => ({ ok: true }),
			}),
		]);
		const response = await app.request('/items/A-S12345678');
		expect(response.status).toBe(200);
		expect(addContext).not.toHaveBeenCalled();
	});

	it('passes transformed inputs to async handlers and applies the response schema', async () => {
		const app = createSrApi(info, [
			defineSrRoute({
				route: createRoute({
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
										length: z.number(),
										confirmed: z.boolean().default(true),
									}),
								},
							},
						},
					},
				}),
				logContext: undefined,
				handler: async ({ params, headers, body }) =>
					Promise.resolve({
						itemId: params.itemId,
						label: headers['x-label'],
						length: body.reference,
					}),
			}),
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
			length: 3,
			confirmed: true,
		});
	});

	it.each([{ ok: 'wrong type' }, { privateData: 'must not reach the client' }])(
		'logs and returns 500 for invalid handler output',
		async (mutation) => {
			const result = { ok: true };
			Object.assign(result, mutation);
			const app = createSrApi(info, [
				defineSrRoute({
					route: createRoute({
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
					}),
					logContext: undefined,
					handler: () => result,
				}),
			]);
			const response = await app.request('/result');
			expect(response.status).toBe(500);
			expect(await response.json()).toEqual({
				message: 'Internal server error',
			});
			expect(errorLog).toHaveBeenCalledTimes(1);
		},
	);

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
			const app = createSrApi(info, []);
			app.get('/failure', () => {
				throw error;
			});
			const response = await app.request('/failure');
			expect(response.status).toBe(status);
			expect(await response.json()).toEqual({ message });
			if (status === 500) {
				expect(errorLog).toHaveBeenCalledWith('API request failed', error);
				expect(errorLog).toHaveBeenCalledTimes(1);
			}
		},
	);
});
