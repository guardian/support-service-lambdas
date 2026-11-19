import type {
	OfHandlerType,
	RouteConfig,
	RouteHandler,
} from '@hono/zod-openapi';
import type { Context, Env } from 'hono';

type JsonRequestParts<Out> = {
	params: Out extends { param: infer Params } ? Params : undefined;
	headers: Out extends { header: infer Headers } ? Headers : undefined;
	body: Out extends { json: infer Body } ? Body : undefined;
};

/**
 * Validated request values inferred from an OpenAPI route.
 * Request-schema defaults and transforms have already been applied; undeclared
 * params, headers or body are undefined.
 *
 * @typeParam R - The standalone route contract, e.g. `typeof route`.
 */
export type JsonRequest<R extends RouteConfig> = JsonRequestParts<
	OfHandlerType<
		(...args: Parameters<RouteHandler<R>>) => Promise<void>
	>['input'] extends { out: infer Out }
		? Out
		: undefined
>;

/**
 * Adapts a plain async business function to a Hono handler.
 *
 * Reads Hono's already-validated params, headers and body, then serialises the
 * function's result as JSON. Use inside defineOpenAPIRoute to retain Hono's
 * route-specific input and response checking.
 *
 * This adapter does not validate either side itself. Hono validates requests;
 * createSrApi validates outgoing responses and handles thrown errors.
 * Use a native Hono handler for custom success statuses, headers or streaming.
 *
 * @param handler - Receives plain request values and resolves to JSON-compatible
 * data, not a Response or an HTTP status/body envelope.
 * @returns An async Hono handler returning JSON with HTTP status 200.
 *
 * @example
 * defineOpenAPIRoute({
 *   route,
 *   handler: withJsonHandler(cancelHandler),
 * });
 */
export function withJsonHandler<
	E extends Env,
	P extends string,
	Out extends { param?: unknown; header?: unknown; json?: unknown },
	const Result,
>(handler: (request: JsonRequestParts<Out>) => Promise<Result>) {
	return async (context: Context<E, P, { out: Out }>) =>
		context.json(
			await handler({
				params: context.req.valid('param'),
				headers: context.req.valid('header'),
				body: context.req.valid('json'),
			}),
			200,
		);
}
