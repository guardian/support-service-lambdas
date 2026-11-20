import { handle } from '@hono/aws-lambda';
import type * as HonoZodOpenapi from '@hono/zod-openapi';
import {
	createRoute,
	defineOpenAPIRoute,
	OpenAPIHono,
	z,
} from '@hono/zod-openapi';
import { loadConfig } from '@modules/aws/appConfig';
import { logger } from '@modules/logger/logger';
import {
	type ApiDefinition,
	ApiGatewayHandler,
	createSrApi,
} from '../src/apiGatewayHandler';
import { withJsonHandler } from '../src/withJsonHandler';

jest.mock('@hono/aws-lambda', () => ({
	handle: jest.fn(() => mockHttpHandler),
}));
jest.mock('@hono/zod-openapi', () => {
	const actual = jest.requireActual<typeof HonoZodOpenapi>('@hono/zod-openapi');
	return {
		...actual,
		OpenAPIHono: jest.fn(
			(...args: ConstructorParameters<typeof actual.OpenAPIHono>) =>
				new actual.OpenAPIHono(...args),
		),
	};
});
jest.mock('@modules/aws/appConfig', () => ({ loadConfig: jest.fn() }));

type HttpHandler = ReturnType<typeof handle>;
const mockHttpHandler = jest.fn<
	ReturnType<HttpHandler>,
	Parameters<HttpHandler>
>();

const info = { title: 'Test API', version: '1.0.0' };
const services = { value: 'injected service' };
const endpoint = defineOpenAPIRoute({
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
	handler: withJsonHandler(async (services: { value: string }) =>
		Promise.resolve({ value: services.value }),
	),
});

afterEach(() => {
	jest.restoreAllMocks();
	jest.clearAllMocks();
});

it('creates a test/local app with supplied services without running cold-start setup', async () => {
	const definition: ApiDefinition<typeof services> = {
		info,
		routes: [endpoint],
	};

	for (const supplied of [services, { value: 'different app service' }]) {
		const response = await createSrApi(definition, supplied, 'CODE').request(
			'/value',
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ value: supplied.value });
	}
	expect(loadConfig).not.toHaveBeenCalled();
	expect(handle).not.toHaveBeenCalled();
});

it('reuses the app and adapter, forwarding responses/context and cleaning up after failure', async () => {
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
	mockHttpHandler.mockRejectedValueOnce(new Error('request failed'));
	const handler = ApiGatewayHandler(
		z.void(),
		{ info, routes: [endpoint] },
		buildServices,
	);
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
	expect(OpenAPIHono).not.toHaveBeenCalled();
	expect(handle).not.toHaveBeenCalled();
	await expect(handler(event, context)).rejects.toThrow('request failed');
	await expect(handler(event, context)).resolves.toBe(result);
	await expect(handler(event, context)).resolves.toBe(result);
	expect(logger.getMessage('test', 'after request')).toBe(
		'[test] after request',
	);

	expect(buildServices).toHaveBeenCalledTimes(1);
	expect(OpenAPIHono).toHaveBeenCalledTimes(1);
	expect(handle).toHaveBeenCalledTimes(1);
	expect(mockHttpHandler).toHaveBeenCalledTimes(3);
	expect(mockHttpHandler).toHaveBeenLastCalledWith(event, context);
	expect(logs).toContain('TRACE lambdaColdStart EXIT');
	expect(logs).not.toContain('injected service');
});
