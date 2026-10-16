import { z } from 'zod';
import { loadConfig } from '@modules/aws/appConfig';
import {
	LambdaHandler,
	LambdaHandlerWithServices,
} from '@modules/routing/lambdaHandler';

const logSpy = jest.fn<void, [string]>();
const errorSpy = jest.fn<void, [string]>();
jest.mock('node:console', () => ({
	log: (message: string) => logSpy(message),
	error: (message: string) => errorSpy(message),
}));
jest.mock('@modules/aws/appConfig', () => ({
	loadConfig: jest.fn(),
}));

const configSchema = z.object({ password: z.string() });
const expectedEnv: unknown = expect.objectContaining({
	stage: 'CODE',
	config: { password: 'hunter2' },
});

const originalEnv = process.env;

beforeEach(() => {
	process.env = {
		...originalEnv,
		STAGE: 'CODE',
		STACK: 'support',
		APP: 'test-app',
	};
	jest.mocked(loadConfig).mockReset();
	jest.mocked(loadConfig).mockResolvedValue({ password: 'hunter2' });
	logSpy.mockClear();
	errorSpy.mockClear();
});

afterEach(() => {
	process.env = originalEnv;
});

describe('LambdaHandlerWithServices', () => {
	it('does not do any cold start work until the first invocation', () => {
		const buildServices = jest.fn(() => ({}));
		LambdaHandlerWithServices(
			configSchema,
			() => Promise.resolve(),
			buildServices,
			'test caller',
		);

		expect(loadConfig).not.toHaveBeenCalled();
		expect(buildServices).not.toHaveBeenCalled();
	});

	it('only runs the cold start on the first run, but runs the handler every time', async () => {
		const services = { client: 'the client' };
		const buildServices = jest.fn(() => Promise.resolve(services));
		const handler = jest.fn<Promise<void>, [unknown, unknown]>(() =>
			Promise.resolve(),
		);
		const lambda = LambdaHandlerWithServices(
			configSchema,
			handler,
			buildServices,
			'test caller',
		);

		await lambda({ id: 1 });
		await lambda({ id: 2 });
		await lambda({ id: 3 });

		expect(loadConfig).toHaveBeenCalledTimes(1);
		expect(buildServices).toHaveBeenCalledTimes(1);
		expect(buildServices).toHaveBeenCalledWith(expectedEnv);
		expect(handler.mock.calls).toEqual([
			[{ id: 1 }, services],
			[{ id: 2 }, services],
			[{ id: 3 }, services],
		]);
		expect(handler.mock.calls[0]?.[1]).toBe(handler.mock.calls[2]?.[1]);
	});

	it('passes handler errors out to the lambda runtime without redoing the cold start', async () => {
		const buildServices = jest.fn(() => ({}));
		const handler = jest
			.fn<Promise<void>, [number, object]>()
			.mockRejectedValueOnce(new Error('handler failed'))
			.mockResolvedValue(undefined);
		const lambda = LambdaHandlerWithServices(
			configSchema,
			handler,
			buildServices,
			'test caller',
		);

		await expect(lambda(1)).rejects.toThrow('handler failed');
		await lambda(2);

		expect(buildServices).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledTimes(2);
	});

	it('retries the cold start on the next invocation if it failed', async () => {
		const buildServices = jest
			.fn<Promise<object>, [unknown]>()
			.mockRejectedValueOnce(new Error('cold start failed'))
			.mockResolvedValue({});
		const handler = jest.fn(() => Promise.resolve());
		const lambda = LambdaHandlerWithServices(
			configSchema,
			handler,
			buildServices,
			'test caller',
		);

		await expect(lambda(1)).rejects.toThrow('cold start failed');
		expect(handler).not.toHaveBeenCalled();

		await lambda(2);

		expect(buildServices).toHaveBeenCalledTimes(2);
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(2, {});
	});

	it('logs the cold start start and finish, without dumping the services', async () => {
		const lambda = LambdaHandlerWithServices(
			configSchema,
			() => Promise.resolve(),
			() => ({ bigClient: { nested: 'DEEP_VALUE' } }),
			'test caller',
		);

		await lambda({});

		expect(logSpy).toHaveBeenCalledWith(
			expect.stringContaining('TRACE lambdaColdStart ENTRY'),
		);
		expect(logSpy).toHaveBeenCalledWith(
			expect.stringMatching(/TRACE lambdaColdStart EXIT[\s\S]*bigClient/),
		);
		expect(logSpy).not.toHaveBeenCalledWith(
			expect.stringContaining('DEEP_VALUE'),
		);
		expect(errorSpy).not.toHaveBeenCalled();
	});

	it('logs a cold start error', async () => {
		const lambda = LambdaHandlerWithServices(
			configSchema,
			() => Promise.resolve(),
			() => Promise.reject(new Error('cold start failed')),
			'test caller',
		);

		await expect(lambda({})).rejects.toThrow('cold start failed');

		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringMatching(
				/TRACE lambdaColdStart ERROR[\s\S]*cold start failed/,
			),
		);
	});
});

describe('LambdaHandler', () => {
	it('loads config once and passes each event and the env to the handler', async () => {
		const handler = jest.fn(() => Promise.resolve());
		const lambda = LambdaHandler(configSchema, handler);

		await lambda({ id: 1 });
		await lambda({ id: 2 });

		expect(loadConfig).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls).toEqual([
			[{ id: 1 }, expectedEnv],
			[{ id: 2 }, expectedEnv],
		]);
	});

	it('logs the cold start and each invocation start and finish', async () => {
		async function myHandler(event: unknown) {
			await Promise.resolve(event);
		}
		const lambda = LambdaHandler(configSchema, myHandler);

		await lambda({ id: 'EVENT_ONE' });

		const logs = logSpy.mock.calls.map((c) => c[0]).join('\n');
		expect(logs).toContain('TRACE lambdaColdStart ENTRY');
		expect(logs).toContain('TRACE lambdaColdStart EXIT');
		expect(logs).toMatch(/TRACE myHandler ENTRY[\s\S]*EVENT_ONE/);
		expect(logs).toContain('TRACE myHandler EXIT');
		expect(errorSpy).not.toHaveBeenCalled();
	});

	it('logs a handler error', async () => {
		const lambda = LambdaHandler(configSchema, function failingHandler() {
			return Promise.reject(new Error('handler failed'));
		});

		await expect(lambda({})).rejects.toThrow('handler failed');

		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringMatching(/TRACE failingHandler ERROR[\s\S]*handler failed/),
		);
	});
});
