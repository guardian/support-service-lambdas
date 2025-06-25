import { mapPartition, zipAll } from '@modules/arrayFunctions';
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

function matchPath(
	routePath: string,
	eventPath: string,
): Record<string, string> | undefined {
	const routeParts = routePath.split('/').filter(Boolean);
	const eventParts = eventPath.split('/').filter(Boolean);

	if (routeParts.length !== eventParts.length) {
		return undefined;
	}

	const routeEventPairs = zipAll(routeParts, eventParts, '', '');
	const [matchers, literals] = mapPartition(
		routeEventPairs,
		([routePart, eventPart]) => {
			const maybeParamName = routePart.match(/^\{(.*)}$/)?.[1];
			return maybeParamName
				? ([maybeParamName, eventPart] as const)
				: undefined;
		},
	);
	if (literals.some(([routePart, eventPart]) => routePart !== eventPart)) {
		return undefined;
	}
	return Object.fromEntries(matchers);
}

export class Router {
	constructor(private routes: Route[]) {}
	async routeRequest(
		event: APIGatewayProxyEvent,
	): Promise<APIGatewayProxyResult> {
		try {
			for (const route of this.routes) {
				const params = matchPath(route.path, event.path);
				if (params && route.httpMethod === event.httpMethod.toUpperCase()) {
					// Attach pathParameters to event
					const eventWithParams = {
						...event,
						pathParameters: { ...(event.pathParameters ?? {}), ...params },
					};

					// Validate request
					const validationErrors: z.ZodIssue[] = [];

					// Validate request path
					try {
						if (route.validation?.path) {
							route.validation.path.parse(eventWithParams.pathParameters);
						}
					} catch (error) {
						if (error instanceof z.ZodError) {
							validationErrors.push(...error.errors);
						} else {
							throw error;
						}
					}

					// Validate request body
					try {
						if (route.validation?.body) {
							const parsedBody: unknown = eventWithParams.body
								? JSON.parse(eventWithParams.body)
								: undefined;
							route.validation.body.parse(parsedBody);
						}
					} catch (error) {
						if (error instanceof z.ZodError) {
							validationErrors.push(...error.errors);
						} else {
							throw error;
						}
					}

					if (validationErrors.length > 0) {
						return {
							statusCode: 400,
							body: JSON.stringify({
								error: 'Invalid request',
								details: validationErrors,
							}),
						};
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
