import { serve } from '@hono/node-server';
import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import type { ApiDefinition } from '../src/apiGatewayHandler';
import { serveApiLocally } from '../src/serveApiLocally';

jest.mock('@hono/node-server', () => ({ serve: jest.fn() }));
jest.mock('@hono/aws-lambda', () => ({ handle: jest.fn() }));

const api: ApiDefinition<{ value: string }> = {
	info: { title: 'Local test API', version: '1.0.0' },
	routes: () => [],
};
const originalExitCode = process.exitCode;

afterEach(() => {
	jest.restoreAllMocks();
	jest.clearAllMocks();
	process.exitCode = originalExitCode;
});

it.each([undefined, 'PROD'])(
	'loads services using stage %s, defaulting to CODE, and serves on loopback port 8787',
	async (stage) => {
		jest.replaceProperty(process, 'env', { ...process.env, STAGE: stage });
		const buildServices = jest.fn(() =>
			Promise.resolve({ value: 'local service' }),
		);

		await serveApiLocally(z.void(), api, buildServices);

		expect(buildServices).toHaveBeenCalledWith(
			expect.objectContaining({ stage: stage ?? 'CODE', config: undefined }),
		);
		expect(serve).toHaveBeenCalledWith(
			expect.objectContaining({ hostname: '127.0.0.1', port: 8787 }),
			expect.any(Function),
		);
	},
);

it('logs failed initialisation and sets a failing exit code without starting the server', async () => {
	jest.replaceProperty(process, 'env', { ...process.env, STAGE: 'CODE' });
	const error = new Error('Services are unavailable');
	const errorLog = jest
		.spyOn(logger, 'error')
		.mockImplementation(() => undefined);

	await serveApiLocally(z.void(), api, () => Promise.reject(error));

	expect(errorLog).toHaveBeenCalledWith('Failed to start local API', error);
	expect(process.exitCode).toBe(1);
	expect(serve).not.toHaveBeenCalled();
});
