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

export type Route<TPath, TBody> = {
	httpMethod: HttpMethod;
	path: string;
	handler: (
		event: APIGatewayProxyEvent,
		parsed: { path: TPath; body: TBody },
	) => Promise<APIGatewayProxyResult>;
	parser?: {
		path?: z.Schema<TPath>;
		body?: z.Schema<TBody>;
	};
};

export function createRoute<TPath, TBody>(
	route: Route<TPath, TBody>,
): Route<unknown, unknown> {
	return route as Route<unknown, unknown>;
}

export const NotFoundResponse = {
	body: 'Not Found',
	statusCode: 404,
};

function matchPath(
	routePath: string,
	eventPath: string,
): { params: Record<string, string> } | undefined {
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
	return { params: Object.fromEntries(matchers) };
}

export class Router {
	constructor(private routes: ReadonlyArray<Route<unknown, unknown>>) {}
	async routeRequest(
		event: APIGatewayProxyEvent,
	): Promise<APIGatewayProxyResult> {
		try {
			for (const route of this.routes) {
				const matchResult = matchPath(route.path, event.path);
				if (
					route.httpMethod.toUpperCase() === event.httpMethod.toUpperCase() &&
					matchResult
				) {
					const eventWithParams = {
						...event,
						pathParameters: {
							...(event.pathParameters ?? {}),
							...matchResult.params,
						},
					};

					let parsedPath, parsedBody;
					try {
						parsedPath = route.parser?.path?.parse(
							eventWithParams.pathParameters,
						);
						parsedBody = route.parser?.body?.parse(
							eventWithParams.body
								? JSON.parse(eventWithParams.body)
								: undefined,
						);
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

					return await route.handler(eventWithParams, {
						path: parsedPath,
						body: parsedBody,
					});
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
