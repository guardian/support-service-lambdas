import { ValidationError } from '@modules/errors';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';

export type HttpMethod =
	| 'GET'
	| 'POST'
	| 'PUT'
	| 'DELETE'
	| 'PATCH'
	| 'OPTIONS'
	| 'HEAD';

type Route<TPath = unknown, TBody = unknown> = {
	httpMethod: HttpMethod;
	path: string;
	handler: (
		event: APIGatewayProxyEvent,
		parsed: { path: TPath; body: TBody }
	) => Promise<APIGatewayProxyResult>;
	validation?: {
		path?: z.Schema<TPath>;
		body?: z.Schema<TBody>;
	};
};

export function createRoute<TPath, TBody>(
	route: Route<TPath, TBody>
): Route<TPath, TBody> {
	return route;
}

export const NotFoundResponse = {
	body: 'Not Found',
	statusCode: 404,
};

function matchPath(routePath: string, eventPath: string): { matched: boolean; params: Record<string, string> } {
	const routeParts = routePath.split('/').filter(Boolean);
	const eventParts = eventPath.split('/').filter(Boolean);

	if (routeParts.length !== eventParts.length) {
		return { matched: false, params: {} };
	}

	const params: Record<string, string> = {};
	for (let i = 0; i < routeParts.length; i++) {
		const routePart = routeParts[i];
		const eventPart = eventParts[i];
		if (routePart?.startsWith('{') && routePart.endsWith('}')) {
			const paramName = routePart.slice(1, -1);
			params[paramName] = eventPart as string;
		} else if (routePart !== eventPart) {
			return { matched: false, params: {} };
		}
	}
	return { matched: true, params };
}

export class Router {
	constructor(private routes: readonly Route<any, any>[]) { }
	async routeRequest(
		event: APIGatewayProxyEvent,
	): Promise<APIGatewayProxyResult> {
		try {
			for (const route of this.routes) {
				const { matched, params } = matchPath(route.path, event.path);
				if (matched && route.httpMethod.toUpperCase() === event.httpMethod.toUpperCase()) {
					// Attach pathParameters to event
					const eventWithParams = {
						...event,
						pathParameters: { ...(event.pathParameters ?? {}), ...params },
					};

					try {
						const parsedPath = route.validation?.path?.parse(eventWithParams.pathParameters);
						const parsedBody = route.validation?.body?.parse(
							eventWithParams.body ? JSON.parse(eventWithParams.body) : undefined,
						);

						return await route.handler(eventWithParams, {
							path: parsedPath,
							body: parsedBody,
						});
					} catch (error) {
						if (error instanceof z.ZodError) {
							return {
								statusCode: 400,
								body: JSON.stringify({
									error: 'Invalid request',
									details: error.errors,
								}),
							};
						}
						throw error;
					}
				}
			}
			return NotFoundResponse;
		} catch (error) {
			console.log('Caught exception with message: ', error);
			if (error instanceof ValidationError) {
				console.log(`Validation failure: ${error.message}`);
				return {
					body: error.message,
					statusCode: 400,
				};
			}
			return {
				body: 'Internal server error',
				statusCode: 500,
			};
		}
	}
}