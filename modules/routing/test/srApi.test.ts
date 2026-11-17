import { createRoute, z } from '@hono/zod-openapi';
import { ValidationError } from '@modules/errors';
import { logger } from '@modules/logger/logger';
import { createSrApi } from '../src/srApi';

const info = { title: 'Test API', description: 'Test API', version: '1.0.0' };
const successResponses = {
	200: {
		description: 'Success',
		content: {
			'application/json': { schema: z.strictObject({ ok: z.boolean() }) },
		},
	},
};

describe('SR API conventions', () => {
	let errorLog: jest.SpyInstance;

	beforeEach(() => {
		jest.spyOn(logger, 'log').mockImplementation(() => undefined);
		errorLog = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('keeps request context through exit logging, excludes credentials and clears context afterwards', async () => {
		const output = jest
			.spyOn(process.stdout, 'write')
			.mockImplementation(() => true);
		const app = createSrApi(info, [
			{
				route: createRoute({
					method: 'get',
					path: '/health',
					responses: successResponses,
				}),
				handler: async () => {
					logger.mutableAddContext('request-reference');
					return Promise.resolve({ ok: true });
				},
			},
		]);
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
		expect(logs).toMatch(/request-reference \[.*TRACE httpRequest EXIT/);
		expect(logs).toContain('GET /health');
		expect(logs).toContain('statusCode: 200');
		expect(logs).not.toContain('private-api-key');
		expect(logs).not.toContain('private-token');
		expect(logger.getMessage('test', 'after request')).toBe(
			'[test] after request',
		);
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

	it('logs and returns 500 for invalid handler output', async () => {
		const result = { ok: true };
		Object.assign(result, { ok: 'must not reach the client' });
		const route = createRoute({
			method: 'get',
			path: '/result',
			responses: successResponses,
		});
		let errorContext = '';
		errorLog.mockImplementation(() => {
			errorContext = logger.getMessage('test', 'failed');
		});
		const app = createSrApi(info, [
			{
				route,
				handler: async () => {
					logger.mutableAddContext('item-reference');
					return Promise.resolve(result);
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
	});

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
				handler: async () => Promise.resolve({ ok: true }),
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
		[new Error('Private implementation detail'), 500, 'Internal server error'],
	])(
		'maps errors without leaking unexpected details',
		async (error, status, message) => {
			const route = createRoute({
				method: 'get',
				path: '/failure',
				responses: successResponses,
			});
			const app = createSrApi(info, [
				{
					route,
					handler: async () => {
						logger.mutableAddContext('failed-item');
						return Promise.reject(error);
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
