import { OpenAPIHono, type RouteConfig, z } from '@hono/zod-openapi';
import type { Context, Next } from 'hono';
import { html } from 'hono/html';
import { HTTPException } from 'hono/http-exception';
import { ValidationError } from '@modules/errors';
import { getCallerInfo } from '@modules/logger/getCallerInfo';
import { logger } from '@modules/logger/logger';
import { createHttpLogging } from './httpLogging';

/**
 * standard openapi info object
 * https://spec.openapis.org/oas/v3.1.0#info-object
 */
type ApiInfo = {
	/** Human-readable title of the API. */
	title: string;
	/** Short summary of the API. */
	summary?: string;
	/** Fuller API description; supports Markdown. */
	description?: string;
	/** OpenAPI document version, distinct from the OpenAPI specification version. */
	version: string;
};

const errorResponseSchema = z
	.object({ message: z.string() })
	.openapi('ErrorResponse');

/*
 * Ready made error responses for endpoints to spread into their contracts.
 * https://github.com/honojs/middleware/tree/main/packages/zod-openapi#usage
 */
export const apiErrorResponses = {
	400: {
		description:
			'[hono] Request schema validation failed or JSON was malformed. Explicit application validation errors may also return 400.',
		content: { 'application/json': { schema: errorResponseSchema } },
	},
	404: {
		description: '[modules/routing] No matching route was found.',
		content: { 'application/json': { schema: errorResponseSchema } },
	},
	415: {
		description: '[hono] Unsupported request content type.',
		content: { 'application/json': { schema: errorResponseSchema } },
	},
	500: {
		description:
			'[modules/routing] An unexpected failure was caught and logged.',
		content: { 'application/json': { schema: errorResponseSchema } },
	},
};

type JsonRoute = RouteConfig & {
	responses: {
		200: {
			content: {
				'application/json': { schema: z.ZodType };
			};
		};
	};
};

/**
 * create an api in your lambda and get all the standard openapi and error functionality
 *
 * @param info useful information for the lambda's open API/swagger page
 * @param routes endpoint definitions to register
 * @param stage defaults to process.env.STAGE; explorer credentials persist only in CODE
 */
export function createSrApi<
	const Routes extends ReadonlyArray<
		Parameters<OpenAPIHono['openapiRoutes']>[0][number] & { route: JsonRoute }
	>,
>(info: ApiInfo, routes: Routes, stage = process.env.STAGE) {
	const callerInfo = getCallerInfo();

	/*
	 * Log and return schema-validation failures.
	 * https://github.com/honojs/middleware/tree/main/packages/zod-openapi#a-dry-approach-to-handling-validation-errors
	 */
	const app = new OpenAPIHono({
		defaultHook: (result, c) => {
			if (!result.success) {
				logger.log('Invalid API request', result.error.issues);
				return c.json({ message: z.prettifyError(result.error) }, 400);
			}
			return undefined;
		},
	});

	/*
	 * Create standard logging and context cleanup for API endpoints.
	 */
	const apiMiddleware = createHttpLogging(callerInfo);

	/*
	 * map ValidationError to 400, log 500 errors without returning the detail
	 * https://hono.dev/docs/api/hono#error-handling
	 * https://hono.dev/docs/api/exception
	 */
	app.onError((error, c) => {
		if (error instanceof ValidationError) {
			logger.log('Invalid API request', error.message);
			return c.json({ message: error.message }, 400);
		}
		if (error instanceof HTTPException && error.status < 500) {
			logger.log('Invalid API request', error.message);
			return c.json({ message: error.message }, error.status);
		}
		logger.error('API request failed', error);
		return c.json({ message: 'Internal server error' }, 500);
	});

	/*
	 * more consistent 404 error response
	 * https://hono.dev/docs/api/hono#not-found
	 */
	app.notFound((c) => c.json({ message: 'Not Found' }, 404));

	/*
	 * Required for endpoint security references/Scalar key entry in the explorer, NOT
	 * runtime authentication. API Gateway enforces the key. OpenAPI Hono documents
	 * this component-registration pattern.
	 * https://github.com/honojs/middleware/tree/main/packages/zod-openapi#how-to-setup-authorization
	 */
	app.openAPIRegistry.registerComponent('securitySchemes', 'apiKey', {
		type: 'apiKey',
		in: 'header',
		name: 'x-api-key',
		description: 'Validated by API Gateway; not required on localhost.',
	});

	/*
	 * Endpoint for the generated OpenAPI 3.1 document.
	 * https://github.com/honojs/middleware/tree/main/packages/zod-openapi#openapi-v31
	 * https://spec.openapis.org/oas/v3.1.0#server-object
	 */
	app.doc31('/openapi.json', {
		openapi: '3.1.0',
		info,
		servers: [
			{ url: '.', description: 'This server, including any API Gateway stage' },
		],
	});

	/*
	 * endpoint for the interactive "try me" UI.
	 * https://scalar.com/products/api-references/getting-started
	 * https://scalar.com/products/api-references/configuration
	 * https://hono.dev/docs/helpers/html
	 */
	app.get('/explorer', (c) =>
		c.html(
			html`<!doctype html>
				<html lang="en">
					<head>
						<meta charset="utf-8" />
						<meta
							name="viewport"
							content="width=device-width, initial-scale=1"
						/>
						<title>${info.title}</title>
					</head>
					<body>
						<div id="app"></div>
						<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.78.1/dist/browser/standalone.js"></script>
						<script>
							Scalar.createApiReference('#app', {
								url: './openapi.json',
								proxyUrl: '',
								persistAuth: ${JSON.stringify(stage === 'CODE')},
								telemetry: false,
							});
						</script>
					</body>
				</html>`,
		),
	);

	return app.openapiRoutes(
		routes.map((endpoint) => {
			const middleware = endpoint.route.middleware;
			const schema =
				endpoint.route.responses[200].content['application/json'].schema;
			return {
				...endpoint,
				route: {
					...endpoint.route,
					middleware: [
						apiMiddleware,
						async (c: Context, next: Next) => {
							await next();
							if (c.res.status !== 200) {
								return;
							}
							try {
								const response = await schema.parseAsync(
									await c.res.clone().json(),
								);
								const headers = new Headers(c.res.headers);
								headers.delete('content-length');
								headers.delete('etag');
								headers.set('content-type', 'application/json');
								c.res = c.json(response, { status: 200, headers });
							} catch (cause) {
								throw new HTTPException(500, {
									message: 'Invalid API response',
									cause,
								});
							}
						},
						...(Array.isArray(middleware)
							? middleware
							: middleware
								? [middleware]
								: []),
					],
				},
			};
		}),
	);
}
