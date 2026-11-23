import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';
import { ValidationError } from '@modules/errors';
import { logger } from '@modules/logger/logger';
import { type ApiDefinition, createSrApi } from '../src/apiGatewayHandler';

jest.mock('@hono/aws-lambda', () => ({ handle: jest.fn() }));

const info = { title: 'Test API', description: 'Test API', version: '1.0.0' };
function createTestApi(routes: ApiDefinition<undefined>['routes']) {
	return createSrApi({ info, routes }, undefined);
}

const successResponses = {
	200: {
		description: 'Success',
		content: {
			'application/json': { schema: z.strictObject({ ok: z.boolean() }) },
		},
	},
};

function captureOutput() {
	const chunks: string[] = [];
	jest.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
		chunks.push(
			typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'),
		);
		return true;
	});
	return () => chunks.join('');
}

describe('SR API conventions', () => {
	let errorLog: jest.SpyInstance;

	beforeEach(() => {
		jest.spyOn(logger, 'log').mockImplementation(() => undefined);
		errorLog = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => {
		logger.resetContext();
		jest.restoreAllMocks();
	});

	it('includes the failing field and Zod validation message in request errors', async () => {
		const output = captureOutput();
		const app = createTestApi([
			defineOpenAPIRoute({
				route: createRoute({
					method: 'post',
					path: '/items',
					request: {
						body: {
							required: true,
							content: {
								'application/json': {
									schema: z.object({
										reason: z.string().min(1, 'Reason must not be empty'),
									}),
								},
							},
						},
					},
					responses: successResponses,
				}),
				handler: async (c) => Promise.resolve(c.json({ ok: true }, 200)),
			}),
		]);

		const response = await app.request('/items', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ reason: '' }),
		});

		expect(response.status).toBe(400);
		const errorResponse: unknown = await response.json();
		expect(errorResponse).toHaveProperty(
			'message',
			expect.stringContaining('reason'),
		);
		expect(errorResponse).toHaveProperty(
			'message',
			expect.stringContaining('Reason must not be empty'),
		);
		expect(output()).toContain('statusCode: 400');
	});

	it.each([
		{ stage: 'CODE', persistAuth: true },
		{ stage: 'PROD', persistAuth: false },
		{ stage: undefined, persistAuth: false },
	])(
		'defaults to STAGE and persists explorer authentication only in CODE ($stage)',
		async ({ stage, persistAuth }) => {
			jest.replaceProperty(process, 'env', { ...process.env, STAGE: stage });
			const app = createTestApi([]);
			const response = await app.request('/explorer');

			expect(response.status).toBe(200);
			expect(await response.text()).toContain(`persistAuth: ${persistAuth},`);
		},
	);

	it('logs credential-safe request/response details without resetting invocation context', async () => {
		const output = captureOutput();
		const app = createTestApi([
			defineOpenAPIRoute({
				route: createRoute({
					method: 'post',
					path: '/items',
					request: {
						body: {
							required: true,
							content: {
								'application/json': {
									schema: z.object({
										entries: z.array(z.object({ password: z.string() })),
									}),
								},
							},
						},
					},
					responses: successResponses,
				}),
				handler: async (c) => {
					logger.mutableAddContext('request-reference');
					c.header('x-session-token', 'response-token');
					return Promise.resolve(c.json({ ok: true }, 200));
				},
			}),
		]);
		logger.mutableAddContext('invocation-reference');
		const response = await app.request('/items', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': 'private-api-key',
			},
			body: JSON.stringify({
				entries: [{ password: 'private-password' }],
			}),
		});
		expect(response.status).toBe(200);
		expect(response.headers.get('x-session-token')).toBe('response-token');
		expect(await response.json()).toEqual({ ok: true });
		const logs = output();
		expect(logs).toMatch(
			/invocation-reference request-reference \[.*TRACE httpRequest EXIT/,
		);
		expect(logs).toContain('"x-api-key": "[len:15,sha256:6bb57354ef5a]"');
		expect(logs).toContain('password: "[len:16,sha256:dca6861589d6]"');
		expect(logs).toContain('"x-session-token": "[len:14,sha256:96129e6e97f5]"');
		for (const secret of [
			'private-api-key',
			'private-password',
			'response-token',
		]) {
			expect(logs).not.toContain(secret);
		}
		expect(logger.getMessage('test', 'after request')).toBe(
			'invocation-reference request-reference [test] after request',
		);
	});

	it('fingerprints malformed JSON rather than leaking credentials from it', async () => {
		const output = captureOutput();
		const app = createTestApi([
			defineOpenAPIRoute({
				route: createRoute({
					method: 'post',
					path: '/items',
					request: {
						body: {
							required: true,
							content: {
								'application/json': {
									schema: z.object({ reason: z.string() }),
								},
							},
						},
					},
					responses: successResponses,
				}),
				handler: async (c) => Promise.resolve(c.json({ ok: true }, 200)),
			}),
		]);

		const body = '{"password":"unparsed-secret';
		const response = await app.request('/items', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body,
		});

		expect(response.status).toBe(400);
		expect(output()).toMatch(
			new RegExp(`\\[len:${body.length},sha256:[a-f0-9]{12}\\]`),
		);
		expect(output()).not.toContain('unparsed-secret');
	});

	it('logs body-reading failures without failing the request', async () => {
		const output = captureOutput();
		const error = new Error('Body is unavailable');
		jest.spyOn(Request.prototype, 'clone').mockImplementationOnce(() => {
			throw error;
		});
		const app = createTestApi([
			defineOpenAPIRoute({
				route: createRoute({
					method: 'get',
					path: '/items',
					responses: successResponses,
				}),
				handler: async (c) => Promise.resolve(c.json({ ok: true }, 200)),
			}),
		]);

		const response = await app.request('/items');

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(errorLog).toHaveBeenCalledWith(
			'Failed to read HTTP body for logging',
			error,
		);
		expect(output()).toContain('[body unavailable]');
	});

	it.each(['invalid output', 'validation exception'])(
		'returns a generic 500 for %s',
		async (failure) => {
			const result = { ok: true };
			if (failure === 'invalid output') {
				Object.assign(result, { ok: 'must not reach the client' });
			}
			const schema = z
				.strictObject({ ok: z.boolean() })
				.superRefine(async () => {
					if (failure === 'validation exception') {
						await Promise.resolve();
						throw new ValidationError('Private response validation failure');
					}
				});
			const route = createRoute({
				method: 'get',
				path: '/result',
				responses: {
					200: {
						description: 'Success',
						content: { 'application/json': { schema } },
					},
				},
			});
			const app = createTestApi([
				defineOpenAPIRoute({
					route,
					handler: async (c) => {
						logger.mutableAddContext('item-reference');
						return Promise.resolve(c.json(result, 200));
					},
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
		[new Error('Private implementation detail'), 500, 'Internal server error'],
	])(
		'maps errors without leaking unexpected details',
		async (error, status, message) => {
			const route = createRoute({
				method: 'get',
				path: '/failure',
				responses: successResponses,
			});
			const app = createTestApi([
				defineOpenAPIRoute({
					route,
					handler: async () => {
						logger.mutableAddContext('failed-item');
						await Promise.resolve();
						throw error;
					},
				}),
			]);
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
