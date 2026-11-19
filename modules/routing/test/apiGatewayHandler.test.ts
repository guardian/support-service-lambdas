import { handle } from '@hono/aws-lambda';
import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';
import { loadConfig } from '@modules/aws/appConfig';
import { logger } from '@modules/logger/logger';
import {
	type ApiDefinition,
	ApiGatewayHandler,
	createSrApi,
} from '../src/apiGatewayHandler';

jest.mock('@hono/aws-lambda', () => ({
	handle: jest.fn(() => mockHttpHandler),
}));
jest.mock('@modules/aws/appConfig', () => ({ loadConfig: jest.fn() }));

type HttpHandler = ReturnType<typeof handle>;
const mockHttpHandler = jest.fn<
	ReturnType<HttpHandler>,
	Parameters<HttpHandler>
>();

const info = { title: 'Test API', version: '1.0.0' };
const services = { value: 'injected service' };
const endpoint = (services: { value: string }) =>
	defineOpenAPIRoute({
		route: createRoute({
			method: 'get',
			path: '/value',
			responses: {
				200: {
					description: 'Success',
					content: {
						'application/json': { schema: z.object({ value: z.string() }) },
					},
				},
			},
		}),
		handler: async (c) =>
			Promise.resolve(c.json({ value: services.value }, 200)),
	});

afterEach(() => {
	jest.restoreAllMocks();
	jest.clearAllMocks();
});

it('creates a test/local app with supplied services without running cold-start setup', async () => {
	const definition: ApiDefinition<typeof services> = {
		info,
		routes: (injected) => [endpoint(injected)],
	};

	const response = await createSrApi(definition, services, 'CODE').request(
		'/value',
	);

	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({ value: services.value });
	expect(loadConfig).not.toHaveBeenCalled();
	expect(handle).not.toHaveBeenCalled();
});

it('reuses and summarises services, forwarding responses/context and cleaning up after failure', async () => {
	jest.replaceProperty(process, 'env', { ...process.env, STAGE: 'CODE' });
	jest.spyOn(logger, 'error').mockImplementation(() => undefined);
	let logs = '';
	jest.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
		logs +=
			typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
		return true;
	});
	const result = {
		statusCode: 200,
		body: '{"value":"injected service"}',
		headers: { 'content-type': 'application/json' },
		isBase64Encoded: false,
	};
	mockHttpHandler.mockImplementation(() => {
		logger.mutableAddContext('request-reference');
		return Promise.resolve(result);
	});
	const buildServices = jest.fn(() => Promise.resolve(services));
	const routes = jest
		.fn(() => [endpoint(services)])
		.mockImplementationOnce(() => {
			throw new Error('app initialisation failed');
		});
	const handler = ApiGatewayHandler(z.void(), { info, routes }, buildServices);
	const event = {
		httpMethod: 'GET',
		path: '/value',
		body: null,
		isBase64Encoded: false,
		requestContext: { elb: { targetGroupArn: 'test-target-group' } },
	};
	const context = {
		callbackWaitsForEmptyEventLoop: false,
		functionName: 'test-api',
		functionVersion: '$LATEST',
		invokedFunctionArn: 'test-function-arn',
		memoryLimitInMB: '128',
		awsRequestId: 'request-id',
		logGroupName: 'test-log-group',
		logStreamName: 'test-log-stream',
		getRemainingTimeInMillis: () => 1000,
	};

	expect(buildServices).not.toHaveBeenCalled();
	await expect(handler(event, context)).rejects.toThrow(
		'app initialisation failed',
	);
	await expect(handler(event, context)).resolves.toBe(result);
	await expect(handler(event, context)).resolves.toBe(result);
	expect(logger.getMessage('test', 'after request')).toBe(
		'[test] after request',
	);

	expect(buildServices).toHaveBeenCalledTimes(1);
	expect(mockHttpHandler).toHaveBeenLastCalledWith(event, context);
	expect(logs).toContain('TRACE lambdaColdStart EXIT');
	expect(logs).toContain('["value"]');
	expect(logs).not.toContain('injected service');
});
