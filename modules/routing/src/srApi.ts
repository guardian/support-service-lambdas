import {
	OpenAPIHono,
	type OpenAPIRoute,
	type RouteConfig,
	z,
} from '@hono/zod-openapi';
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

type RouteRequest<R extends RouteConfig> = {
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

type RouteValidation<R extends RouteConfig> = {
	out: {
		param: RouteRequest<R>['params'];
		header: RouteRequest<R>['headers'];
		json: RouteRequest<R>['body'];
	};
};

/*
 * JSON endpoints receive validated data, not framework context, and return the
 * input to their mandatory 200 response schema. Parse that result before sending
 * it so response defaults/transforms apply and invalid output becomes a 500.
 */
export function defineSrRoute<
	R extends JsonRoute,
	const Result extends RouteResponse<R>,
>(
	definition: Omit<OpenAPIRoute<R>, 'handler'> & {
		logContext: ((request: RouteRequest<NoInfer<R>>) => string) | undefined;
		handler: (request: RouteRequest<NoInfer<R>>) => Result | Promise<Result>;
	},
) {
	const { logContext, ...endpoint } = definition;
	return {
		...endpoint,
		handler: async (c: Context<Env, string, RouteValidation<R>>) => {
			const request: RouteRequest<R> = {
				params: c.req.valid('param'),
				headers: c.req.valid('header'),
				body: c.req.valid('json'),
			};
			if (logContext !== undefined) {
				logger.mutableAddContext(logContext(request));
			}
			const result = await endpoint.handler(request);
			const response =
				await endpoint.route.responses[200].content[
					'application/json'
				].schema.parseAsync(result);
			return c.json(response, 200);
		},
	};
}

/**
 * create an api in your lambda and get all the standard openapi and error functionality
 *
 * @param info useful information for the lambda's open API/swagger page
 * @param routes endpoint definitions to register
 */
export function createSrApi<
	const Routes extends Parameters<OpenAPIHono['openapiRoutes']>[0],
>(info: ApiInfo, routes: Routes) {
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
	 * Reuse standard function entry/exit formatting and request context cleanup.
	 * Project only the method/path and response status, not the Hono context or
	 * credential headers. Hono catches exceptions inside next(), so onError below
	 * remains responsible for logging unexpected failures once.
	 * https://hono.dev/docs/guides/middleware#execution-order
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
	 * Hono has default error handling, so this is optional. Our override maps
	 * repository ValidationError to 400, preserves framework client statuses
	 * (including malformed JSON/media-type errors), and logs unexpected failures
	 * while returning a generic JSON 500 without internals.
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
	 * Optional JSON consistency only: Hono already returns 404 for unknown routes.
	 * Omit this if its default text response is acceptable.
	 * https://hono.dev/docs/api/hono#not-found
	 */
	app.notFound((c) => c.json({ message: 'Not Found' }, 404));

	/*
	 * Required for endpoint security references/Scalar key entry in our docs, NOT
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
	 * Required to serve our generated OpenAPI 3.1 document. The explicit relative
	 * server URL is our deployment choice: the OpenAPI default "/" would lose a
	 * raw API Gateway stage prefix during "try me" calls.
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
	 * Optional trailing-slash convenience. Hono uses strict paths by default;
	 * redirecting also keeps "./openapi.json" relative to the correct directory
	 * instead of resolving to "/docs/openapi.json".
	 * https://hono.dev/docs/api/hono#strict-mode
	 */
	app.get('/docs/', (c) => c.redirect('../docs'));
	/*
	 * Required for the requested interactive UI, not for API routing. This follows
	 * Scalar's HTML integration and Hono's html helper. Pinning the browser bundle
	 * is our reproducibility choice; disabling the proxy, credential persistence
	 * and telemetry is our configuration, not a requirement from Scalar.
	 * Requests must go directly to our authenticated API.
	 * https://scalar.com/products/api-references/getting-started
	 * https://scalar.com/products/api-references/configuration
	 * https://hono.dev/docs/helpers/html
	 */
	app.get('/docs', (c) =>
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

	/*
	 * Register the supplied route array with Hono's native type inference and
	 * return the configured app for Lambda/local adapters.
	 * https://hono.dev/docs/getting-started/aws-lambda
	 */
	return app.openapiRoutes(routes);
}
