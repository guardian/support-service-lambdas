import { mapPartition, zipAll } from '@modules/arrayFunctions';
import { ValidationError } from '@modules/errors';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { ZodTypeDef } from 'zod';
import { z } from 'zod';
import { logger } from '@modules/routing/logger';

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
		path?: z.Schema<TPath, ZodTypeDef, unknown>;
		body?: z.Schema<TBody, ZodTypeDef, unknown>;
	};
};

export function createRoute<TPath, TBody>(
	route: Route<TPath, TBody>,
): Route<unknown, unknown> {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- todo see if it's fixable
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

	const lastRoutePart = routeParts[routeParts.length - 1]!;
	const routeIsGreedy = lastRoutePart.endsWith('+}');
	let adjustedEventParts: string[];
	if (routeIsGreedy && routeParts.length < eventParts.length) {
		const excessParts = eventParts.slice(routeParts.length - 1);
		const joinedGreedyValue = excessParts.join('/');
		adjustedEventParts = [
			...eventParts.slice(0, routeParts.length - 1),
			joinedGreedyValue,
		];
	} else {
		adjustedEventParts = eventParts;
	}

	if (routeParts.length !== adjustedEventParts.length) {
		return undefined;
	}

	const routeEventPairs = zipAll(routeParts, adjustedEventParts, '', '');
	const [matchers, literals] = mapPartition(
		routeEventPairs,
		([routePart, eventPart]) => {
			const maybeParamName = routePart.match(/^\{([^+}]*)\+?}$/)?.[1];
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

export function Router(routes: ReadonlyArray<Route<unknown, unknown>>) {
	const httpRouter = async (
		event: APIGatewayProxyEvent,
	): Promise<APIGatewayProxyResult> => {
		try {
			for (const route of routes) {
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
	};

	return logger.wrapRouter(
		httpRouter,
		undefined,
		undefined,
		0,
		logger.getCallerInfo(),
	);
}
