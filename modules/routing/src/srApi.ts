import { OpenAPIHono, type RouteConfig, z } from '@hono/zod-openapi';
import type { Context, Env, Next } from 'hono';
import { html } from 'hono/html';
import { HTTPException } from 'hono/http-exception';
import { ValidationError } from '@modules/errors';
import { getCallerInfo } from '@modules/logger/getCallerInfo';
import { logger } from '@modules/logger/logger';

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
	request?: {
		params?: z.ZodType;
		headers?: z.ZodType;
		body?: {
			required: true;
			content: { 'application/json': { schema: z.ZodType } };
		};
	};
	responses: {
		200: {
			content: {
				'application/json': { schema: z.ZodType };
			};
		};
	};
};

type ParsedPart<Request, Key extends PropertyKey> =
	Request extends Record<Key, infer Schema extends z.ZodType>
		? z.output<Schema>
		: undefined;

export type SrRequest<R extends RouteConfig> = {
	params: ParsedPart<R['request'], 'params'>;
	headers: ParsedPart<R['request'], 'headers'>;
	body: R['request'] extends {
		body: {
			content: {
				'application/json': { schema: infer Schema extends z.ZodType };
			};
		};
	}
		? z.output<Schema>
		: undefined;
};

type RouteResponse<R extends JsonRoute> = z.input<
	R['responses'][200]['content']['application/json']['schema']
>;

type SrEndpoint<R extends JsonRoute, Result extends RouteResponse<R>> = {
	route: R;
	handler: (request: SrRequest<NoInfer<R>>) => Result | Promise<Result>;
};

type RegisteredEndpoint = {
	route: JsonRoute;
	handler(
		this: void,
		request: { params: unknown; headers: unknown; body: unknown },
	): unknown;
};

/**
 * create an api in your lambda and get all the standard openapi and error functionality
 *
 * @param info useful information for the lambda's open API/swagger page
 * @param routes endpoint definitions to register
 */
export function createSrApi<
	const Routes extends readonly JsonRoute[],
	const Results extends { [K in keyof Routes]: RouteResponse<Routes[K]> },
>(
	info: ApiInfo,
	routes: { [K in keyof Routes]: SrEndpoint<Routes[K], Results[K]> },
): OpenAPIHono;
export function createSrApi(
	info: ApiInfo,
	routes: readonly RegisteredEndpoint[],
) {
	const callerInfo = getCallerInfo();

	/*
	 * Log and return schema-validation failures.
	 * https://github.com/honojs/middleware/tree/main/packages/zod-openapi#a-dry-approach-to-handling-validation-errors
	 */
	const app = new OpenAPIHono({
		defaultHook: (result, c) => {
			if (!result.success) {
				logger.log('Invalid API request', result.error.issues);
				return c.json({ message: 'Invalid request body' }, 400);
			}
			return undefined;
		},
	});

	/*
	 * add standard logging and context clearance to all routes
	 */
	app.use(
		'*',
		logger.withContext(
			logger.wrapFn(
				async (c: Context, next: Next) => {
					await next();
					return c.res;
				},
				'httpRequest',
				callerInfo,
				([c]) => ({
					logOnEntryAndExit: `${c.req.method} ${c.req.path}`,
				}),
				(response) => ({ statusCode: response.status }),
			),
			undefined,
			true,
		),
	);

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
								persistAuth: false,
								telemetry: false,
							});
						</script>
					</body>
				</html>`,
		),
	);

	return app.openapiRoutes(
		routes.map(({ route, handler }) => ({
			route,
			handler: async (
				c: Context<
					Env,
					string,
					{ out: { param: unknown; header: unknown; json: unknown } }
				>,
			) => {
				const result = await handler({
					params: c.req.valid('param'),
					headers: c.req.valid('header'),
					body: c.req.valid('json'),
				});
				try {
					const response =
						await route.responses[200].content[
							'application/json'
						].schema.parseAsync(result);
					return c.json(response, 200);
				} catch (cause) {
					throw new HTTPException(500, {
						message: 'Invalid API response',
						cause,
					});
				}
			},
		})),
	);
}
