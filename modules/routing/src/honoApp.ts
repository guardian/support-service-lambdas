import { OpenAPIHono } from '@hono/zod-openapi';
import { ValidationError } from '@modules/errors';
import { logger } from '@modules/logger/logger';
import { prettyPrint } from '@modules/prettyPrint';
import type { Env } from 'hono';
import { handle } from 'hono/aws-lambda';
import { honoLoggingMiddleware } from './honoLoggingMiddleware';
import { buildScalarDocsHtml } from './honoOpenApiDocs';

/**
 * Creates a pre-configured OpenAPIHono app with:
 * - Standard request/response logging middleware
 * - Centralised error handling (ValidationError → 400, all others → 500)
 * - Standard validation error hook (replaces withBodyParser / withPathParser)
 * - /openapi.json spec endpoint
 * - /docs Scalar UI endpoint
 *
 * Returns both the hono app (for registering routes and testing with app.request())
 * and the Lambda handler entry point.
 *
 * @param title - API title shown in docs and the OpenAPI spec
 */
export function createHonoApp<E extends Env = Env>(title: string) {
	const app = new OpenAPIHono<E>({
		defaultHook: (result, c) => {
			if (result.success) {
				return;
			}
			const errorTarget = result.target === 'param' ? 'path' : result.target;
			return c.json(
				{
					error: `Invalid request ${errorTarget} - wrong type`,
					details: result.error.errors,
				},
				400,
			);
		},
	});

	app.use(honoLoggingMiddleware);

	app.onError((err, c) => {
		if (err instanceof ValidationError) {
			logger.log(
				`Handler returned 400 response due to validation error: ${prettyPrint(err)}`,
			);
			return c.json({ message: err.message }, 400);
		}
		logger.log(
			`Handler returned 500 response due to unexpected error: ${prettyPrint(err)}`,
		);
		return c.json({ message: 'Internal server error' }, 500);
	});

	app.doc('/openapi.json', {
		openapi: '3.0.0',
		info: { title, version: '1.0.0' },
		servers: [{ url: '/' }],
	});

	app.get('/docs', (c) =>
		c.html(buildScalarDocsHtml('/openapi.json', title), 200),
	);

	return { app, handler: handle(app) };
}
