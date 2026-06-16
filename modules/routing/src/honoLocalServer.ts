import { execFile } from 'node:child_process';
import { serve } from '@hono/node-server';
import type { OpenAPIHono } from '@hono/zod-openapi';
import { logger } from '@modules/logger/logger';

/**
 * Serves a hono app locally for development, opening the Scalar docs UI in the browser.
 *
 * Sets STAGE=CODE so that SSM config is loaded from the CODE environment.
 * HOST and PORT can be overridden via options.
 *
 * Usage in runManual/local.ts:
 *   #!/usr/bin/env tsx
 *   import { serveLocally } from '@modules/routing/honoLocalServer';
 *   import { app } from './index';
 *   serveLocally(app);
 */
export function serveLocally(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts any OpenAPIHono Env shape
	app: OpenAPIHono<any>,
	port: number,
): void {
	const stage = 'CODE';
	const host = '127.0.0.1';

	process.env['STAGE'] = stage;

	const docsUrl = `http://${host}:${port}/docs`;

	const server = serve({ fetch: app.fetch, hostname: host, port }, () => {
		logger.log(`Local server running on ${docsUrl}`);
		execFile('open', [docsUrl], (error) => {
			if (error) {
				logger.log(`Failed to open browser automatically: ${error.message}`);
			}
		});
	});

	const shutdown = () => {
		server.close();
		process.exit(0);
	};

	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);
}
