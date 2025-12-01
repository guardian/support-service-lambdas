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

export type Handler<TPath, TBody> = (
	event: APIGatewayProxyEvent,
	path: TPath,
	body: TBody,
) => Promise<APIGatewayProxyResult>;

export type Route<TPath, TBody> = {
	httpMethod: HttpMethod;
	path: string;
	handler: Handler<TPath, TBody>;
};

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
