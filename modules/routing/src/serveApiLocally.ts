import { serve } from '@hono/node-server';
import type { z } from 'zod';
import { logger } from '@modules/logger/logger';
import { type ApiDefinition, createSrApi } from './apiGatewayHandler';
import type { HandlerEnv } from './lambdaHandler';
import { loadHandlerEnv } from './lambdaHandler';

export async function serveApiLocally<Config, Services>(
	configSchema: z.ZodType<Config>,
	api: ApiDefinition<Services>,
	buildServices: (env: HandlerEnv<Config>) => Promise<Services>,
) {
	try {
		process.env.STAGE ??= 'CODE';
		const env = await loadHandlerEnv(configSchema);
		const app = createSrApi(api, await buildServices(env), env.stage);
		return serve(
			{ fetch: app.fetch, hostname: '127.0.0.1', port: 8787 },
			(info) => {
				logger.log(`${api.info.title}: http://localhost:${info.port}/explorer`);
			},
		);
	} catch (error) {
		logger.error('Failed to start local API', error);
		process.exitCode = 1;
		return undefined;
	}
}
