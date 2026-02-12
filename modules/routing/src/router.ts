import { mapPartition, mapValues, zipAll } from '@modules/arrayFunctions';
import { ValidationError } from '@modules/errors';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { logger } from '@modules/routing/logger';

export type HttpMethod =
	| 'GET'
	| 'POST'
	| 'PUT'
	| 'DELETE'
	| 'PATCH'
	| 'OPTIONS'
	| 'HEAD';

export type Handler<E, TPath, TBody> = (
	event: E,
	path: TPath,
	body: TBody,
) => Promise<APIGatewayProxyResult>;

export type Route<TPath, TBody> = {
	httpMethod: HttpMethod;
	path: string;
	handler: Handler<APIGatewayProxyEvent, TPath, TBody>;
};

export const NotFoundResponse = {
	body: 'Not Found',
	statusCode: 404,
};

/**
 * if routeParts ends with a greedy `+`, batch together the last eventsParts accordingly
 */
export function zipRouteWithEventPath(
	routeParts: string[],
	eventParts: string[],
) {
	const lastRoutePart: string | undefined = routeParts[routeParts.length - 1];
	const routeIsGreedy = lastRoutePart?.endsWith('+}');
	let adjustedEventParts;
	let adjustedRouteParts;
	if (lastRoutePart && routeIsGreedy && routeParts.length < eventParts.length) {
		const excessParts = eventParts.slice(routeParts.length - 1);
		const joinedGreedyValue = excessParts.join('/');
		adjustedEventParts = [
			...eventParts.slice(0, routeParts.length - 1),
			joinedGreedyValue,
		];
		const adjustedLastRoutePart = lastRoutePart.replace(/\+}/, '}');
		adjustedRouteParts = [
			...routeParts.slice(0, routeParts.length - 1),
			adjustedLastRoutePart,
		];
	} else if (routeParts.length === eventParts.length) {
		adjustedEventParts = eventParts;
		adjustedRouteParts = routeParts;
	} else {
		return undefined;
	}
	return zipAll(adjustedRouteParts, adjustedEventParts, '', '');
}

function matchPath(
	routePath: string,
	eventPath: string,
): { params: Record<string, string> } | undefined {
	const routeParts = routePath.split('/').filter(Boolean);
	const eventParts = eventPath.split('/').filter(Boolean);

	const routeEventPairs = zipRouteWithEventPath(routeParts, eventParts);
	if (routeEventPairs === undefined) {
		return undefined;
	}

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

export function Router(
	routes: ReadonlyArray<Route<Record<string, string>, string | null>>,
) {
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
							...mapValues(event.pathParameters ?? {}, (v) => v ?? ''),
							...matchResult.params,
						},
					};

					return await route.handler(
						eventWithParams,
						eventWithParams.pathParameters,
						eventWithParams.body,
					);
				}
			}
			return NotFoundResponse;
		} catch (error) {
			logger.log('Caught exception with message: ', error);
			if (error instanceof ValidationError) {
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

	return logger.wrapFn(
		httpRouter,
		'HANDLER',
		({ args }) => ({ args: [args[0]], paramNames: ['event'] }),
		(result) => result,
		(args) => ({ args: [args[0]], paramNames: ['event'] }),
		(result) => result,
		undefined,
		undefined,
		0,
		logger.getCallerInfo(),
		true,
	);
}
