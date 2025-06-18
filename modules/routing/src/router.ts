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

type Route = {
	httpMethod: HttpMethod;
	path: string;
	handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
	validation?: {
		path?: z.Schema;
		body?: z.Schema;
	};
};

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
	constructor(private routes: Route[]) { }
	async routeRequest(
		event: APIGatewayProxyEvent,
	): Promise<APIGatewayProxyResult> {
		try {
			for (const route of this.routes) {
				const { matched, params } = matchPath(route.path, event.path);
				if (matched && route.httpMethod === event.httpMethod.toUpperCase()) {
					// Attach pathParameters to event
					const eventWithParams = {
						...event,
						pathParameters: { ...(event.pathParameters ?? {}), ...params },
					};

					// Validate request path
					try {
						if (route.validation?.path) {
							route.validation.path.parse(eventWithParams.pathParameters);
						}
					} catch (error) {
						if (error instanceof z.ZodError) {
							return {
								statusCode: 400,
								body: JSON.stringify({
									error: 'Invalid path',
									details: error.errors
								})
							};
						}
						throw error;
					}

					// Validate request body
					try {
						if (route.validation?.body) {
							const parsedBody: unknown = eventWithParams.body ? JSON.parse(eventWithParams.body) : undefined;
							route.validation.body.parse(parsedBody);
						}
					} catch (error) {
						if (error instanceof z.ZodError) {
							return {
								statusCode: 400,
								body: JSON.stringify({
									error: 'Invalid body',
									details: error.errors
								})
							};
						}
						throw error;
					}

					return await route.handler(eventWithParams);
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
